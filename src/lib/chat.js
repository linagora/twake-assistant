import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import unified from 'unified'

import Minilog from 'cozy-minilog'

import { ChatEventStream } from '@/lib/chatEvents'
import { stopAnswerOnAbort } from '@/lib/stopAnswer'

const log = Minilog('🤖 [Chat]')

// The error of the stack on a conversation whose assistant was deleted
const ASSISTANT_NOT_FOUND = 'assistant not found'

// The marks of the sources the LLM leaves in an answer from the documents:
// [REF]doc_1[/REF], REFdoc_1/REF, [doc_1], [Source 1, 2], [Sources: 1, 2]
const SOURCE_MARKS = [
  /\s?\[REF\][\s\S]*?\[\/REF\]/g,
  /\s?REF\S*?\/REF/g,
  /\s?\[doc_\d+\]/g,
  /\s?\[Source\s+\d+(?:\s*,\s*(?:Source\s+)?\d+)*\]/g,
  /\s?\[Sources?:\s*\d+(?:\s*,\s*\d+)*\s*\](?:\([^)]*\))?/g
]

/**
 * @param {string} text - the answer of the LLM
 * @returns {string} the answer without the marks of its sources
 */
export function removeSourceMarks(text) {
  return SOURCE_MARKS.reduce((result, mark) => result.replace(mark, ''), text)
}

// The parser of the Markdown component of cozy-ui, which shows the answers
const markdown = unified().use(remarkParse).use(remarkGfm)

// The nodes whose children are blocks or cells, words apart
const BLOCKS = ['root', 'blockquote', 'list', 'listItem', 'table', 'tableRow']

function getWords(node) {
  if (node.type === 'image') return node.alt ?? ''
  if (node.type === 'break') return ' '
  if (typeof node.value === 'string') return node.value

  return (node.children ?? [])
    .map(getWords)
    .join(BLOCKS.includes(node.type) ? ' ' : '')
}

/**
 * @param {string} text - the answer of the LLM, in Markdown
 * @returns {string} its words on one line, for a preview: without the marks
 * of its sources nor the syntax of Markdown
 */
export function toPlainText(text) {
  return getWords(markdown.parse(removeSourceMarks(text)))
    .replace(/\s+/g, ' ')
    .trim()
}

// The start of a mark at the end of an answer still written: an open
// [REF]…, the first letters of [REF], [doc_1], [Source 1] or [Sources: 1]
// (a word at most, when it is not one), an open (…) after [Sources: 1],
// an open REF…/REF (not the REF of a whole [REF]…[/REF])
const PARTIAL_MARK =
  /\s?(?:\[REF\](?:(?!\[\/REF\])[\s\S])*|\[(?:R[A-Z]*\]?|d[a-z]*_?\d*|S[a-z]*:?(?:[\s\d,]|S[a-z]*)*)?|\[Sources?:?[\s\d,]*\]\([^)]*|(?<![[/])\bREF\S*)$/

function findLastUserText(messages) {
  const message = messages.findLast(message => message.role === 'user')
  const part = message?.content.find(part => part.type === 'text')

  return part?.text ?? null
}

// The stack answers with the conversation: its last message is the one just
// sent, whose id is the one of the events of its answer
function getMessageId(response) {
  const messages = response?.data?.attributes?.messages ?? []
  const message = messages.findLast(message => message.role === 'user')
  if (!message?.id) throw new Error('No message in the conversation')

  return message.id
}

function getDocumentNotice(doc) {
  if (doc === null) return 'unavailable'
  return doc.isTruncated ? 'truncated' : null
}

function waitForAbort(abortSignal) {
  return new Promise(resolve => {
    if (!abortSignal) return
    if (abortSignal.aborted) resolve()
    else abortSignal.addEventListener('abort', resolve, { once: true })
  })
}

/**
 * Gathers the pieces of an answer, which the realtime may give out of order
 */
function makeAnswer() {
  const chunks = []

  return {
    add: ({ content, position }) => {
      if (typeof content !== 'string') return
      if (Number.isInteger(position)) {
        chunks[position] = content
      } else {
        chunks.push(content)
      }
    },
    // What can be shown: the pieces before the first one still awaited. Until
    // the answer is whole, the start of a mark is held back: it would show
    // until its end comes.
    getText: ({ isWhole = false } = {}) => {
      const missing = Array.from(chunks).findIndex(chunk => chunk === undefined)
      const known = missing === -1 ? chunks : chunks.slice(0, missing)
      const text = known.join('')
      return removeSourceMarks(isWhole ? text : text.replace(PARTIAL_MARK, ''))
    }
  }
}

/**
 * @typedef {object} ChatRequest
 * @property {(text: string, context: { isFirstOnText: boolean, hasSelection: boolean, document: string|null }) => string} prepareQuery -
 * turns the text of a message into the query sent to the stack:
 * `isFirstOnText` for the first message about the text of the app,
 * `hasSelection` false to leave that text out, `document` the whole
 * document of the app when the user includes it
 * @property {boolean} hasDocuments - whether the answer comes from the
 * documents of the user
 * @property {boolean} [hasDocument] - whether a typed request includes the
 * whole document of the app, a prompt of the catalogue never does
 * @property {boolean} [hasConversation] - false to send each request in a
 * new conversation of its own
 * @property {boolean} [hasSelection] - false to leave the text of the app
 * out of a typed request
 * @property {string} [text] - the text of the app
 * @property {((index: number, text: string) => void)|null} [recordSentText] -
 * called with the index of a message, among the messages of the user, and
 * the text of the app when that message sends it
 * @property {(() => Promise<{ document: string, isTruncated: boolean }|null>)|null} [requestDocument] -
 * asks the app for its document, null when it cannot give it
 * @property {string|null} instructions - how to answer, sent to the LLM as a
 * system message
 * @property {string|null} [rules] - the rules of the app, joined to the
 * system message of every request, a prompt of the catalogue included
 * @property {(name: string) => { q: string, instructions: string|null }|null} [preparePrompt] -
 * the query and the instructions of a prompt of the catalogue, for a message
 * sent by a suggestion
 * @property {object[]} actions - the capabilities of the app, as chat actions
 * of cozy-stack
 * @property {string|null} [assistantId] - the assistant that answers, the one
 * of the stack without it
 * @property {boolean} [websearch] - whether the answer may come from the web
 */

/**
 * The link between a conversation of assistant-ui and the chat of the
 * stack: a message is posted to the conversation, and its answer
 * comes with the realtime events.
 *
 * @param {object} options
 * @param {import('cozy-client/types/CozyClient').default} options.client
 * @param {string} options.conversationId
 * @param {import('./chatEvents').ChatEventStream} options.events
 * @param {() => ChatRequest} options.getRequest - how to send a message,
 * read when it is sent: the user changes it between two messages
 * @param {(index: number) => number} [options.getTextIndex] - the index,
 * among the messages of the user, of the first one about the text of the
 * app, given the index of the message sent
 * @param {(index: number) => void} [options.releaseText] - called when the
 * message of this index does not send the text of the app: the next one
 * does
 * @param {() => string} [options.getConversationId] - the conversation the
 * message is posted to, read when it is sent
 * @returns {import('@assistant-ui/react').ChatModelAdapter}
 */
export function makeChatAdapter({
  client,
  conversationId,
  events,
  getRequest,
  getTextIndex = () => 0,
  releaseText = () => {},
  getConversationId = () => conversationId
}) {
  return {
    async *run({ messages, abortSignal, runConfig }) {
      const text = findLastUserText(messages)
      if (text === null) return

      const {
        prepareQuery,
        preparePrompt,
        hasDocuments,
        hasDocument,
        hasSelection,
        requestDocument,
        instructions,
        rules,
        actions,
        assistantId,
        websearch,
        text: appText,
        recordSentText
      } = getRequest()
      const index =
        messages.filter(message => message.role === 'user').length - 1
      const isFirstOnText = index === getTextIndex(index)
      const runConversationId = getConversationId()
      // A prompt of the catalogue, from a suggestion, brings its own query
      // and instructions, about the text of the app only
      const custom = runConfig?.custom ?? {}
      const prompt = custom.prompt ? preparePrompt?.(custom.prompt) : null
      if (!custom.prompt && hasSelection === false) releaseText(index)
      const isDocumentIncluded = hasDocument && !custom.prompt
      let doc = null
      if (isDocumentIncluded) {
        // The app may take seconds to answer, or never: Stop does not wait
        doc =
          (await Promise.race([
            requestDocument?.(),
            waitForAbort(abortSignal)
          ])) ?? null
        if (abortSignal?.aborted) {
          releaseText(index)
          return
        }
      }
      const query =
        prompt?.q ??
        prepareQuery(text, {
          isFirstOnText,
          hasSelection,
          document: doc?.document ?? null
        })
      const isTextSent =
        Boolean(prompt) || (isFirstOnText && hasSelection !== false)
      if (isTextSent && appText?.trim()) recordSentText?.(index, appText)
      const documentNotice = isDocumentIncluded ? getDocumentNotice(doc) : null
      // assistant-ui sets the custom metadata of the answer anew at each
      // yield that has some: the notice goes in each one
      const notice = documentNotice ? { documentNotice } : {}
      const system = [
        prompt ? prompt.instructions : (custom.instructions ?? instructions),
        rules
      ]
        .filter(Boolean)
        .join('\n\n')
      const answer = makeAnswer()
      const reasoning = makeAnswer()
      const getContent = ({ isWhole = false } = {}) => {
        const thought = reasoning.getText({ isWhole })
        return [
          ...(thought !== '' ? [{ type: 'reasoning', text: thought }] : []),
          { type: 'text', text: answer.getText({ isWhole }) }
        ]
      }
      let sources = null
      let action = null

      if (documentNotice) {
        yield { content: getContent(), metadata: { custom: notice } }
      }

      try {
        events.clear()
        const response = await client.stackClient.fetchJSON(
          'POST',
          `/ai/chat/conversations/${runConversationId}`,
          {
            q: query,
            // The LLM answers alone, unless the user asks for their documents
            ...(!hasDocuments && { documents: false }),
            ...(system && { instructions: system }),
            ...(actions?.length > 0 && { actions }),
            ...(assistantId && { assistantID: assistantId }),
            ...(websearch && { websearch: true })
          }
        )
        stopAnswerOnAbort({
          client,
          conversationId: runConversationId,
          abortSignal
        })

        for await (const event of events.read(
          getMessageId(response),
          abortSignal
        )) {
          if (event.object === 'error') throw new Error(event.message)
          if (event.object === 'sources') sources = event.content
          if (event.object === 'action') action = event.action ?? null
          if (event.object === 'reasoning') {
            reasoning.add(event)
            yield { content: getContent() }
          }
          if (event.object === 'delta') {
            answer.add(event)
            yield { content: getContent() }
          }
        }

        // The user has stopped the answer: what came stays as it is
        if (abortSignal?.aborted) return

        const answerText = answer.getText({ isWhole: true })
        yield {
          content: getContent({ isWhole: true }),
          status: { type: 'complete', reason: 'stop' },
          metadata: {
            custom: {
              ...notice,
              ...(answerText.trim() === '' && !action && { isEmpty: true }),
              ...(sources?.length > 0 && { sources }),
              ...(action && { action })
            }
          }
        }
      } catch (error) {
        log.error('No answer', error)
        yield {
          content: getContent(),
          status: { type: 'incomplete', reason: 'error' },
          metadata: {
            custom: {
              ...notice,
              isError: true,
              ...(error.message === ASSISTANT_NOT_FOUND && {
                isAssistantGone: true
              })
            }
          }
        }
      }
    }
  }
}

const DEFAULT_REQUEST = {
  prepareQuery: text => text,
  hasDocuments: false,
  hasDocument: false,
  hasConversation: true,
  hasSelection: true,
  text: '',
  recordSentText: null,
  requestDocument: null,
  instructions: null,
  rules: null,
  actions: []
}

/**
 * The chat of a conversation: the stream of the events of its answers, and
 * the adapter of the conversation, which sends each message as the request
 * of the moment says
 *
 * @param {object} options
 * @param {import('cozy-client/types/CozyClient').default} options.client
 * @param {string} options.conversationId
 * @param {() => string} [options.makeFreshConversationId] - the id of a new
 * conversation, for a request sent without the conversation
 * @param {number} [options.textIndex] - the index, among the messages of the
 * user, of the first one about the text of the app: the number of requests
 * of a past conversation
 * @returns {{
 *   events: ChatEventStream,
 *   adapter: import('@assistant-ui/react').ChatModelAdapter,
 *   setRequest: (request: Partial<ChatRequest>) => void,
 *   startNewText: () => void
 * }}
 */
export function makeChat({
  client,
  conversationId,
  makeFreshConversationId,
  textIndex = 0
}) {
  const events = new ChatEventStream()
  let request = DEFAULT_REQUEST
  // The first message about the text of the app: the first new one, or the
  // next one after the app gives another text. A message sent again keeps
  // its index, and is still about the text.
  let firstOnText = textIndex
  const releaseText = index => {
    if (firstOnText === index) firstOnText = null
  }

  return {
    events,
    adapter: makeChatAdapter({
      client,
      conversationId,
      events,
      getRequest: () => request,
      getConversationId: () =>
        request.hasConversation === false
          ? makeFreshConversationId()
          : conversationId,
      getTextIndex: index => {
        // A fresh conversation does not hold the text: it goes with each
        // message, and with the next one of the conversation if this one
        // was to bring it
        if (request.hasConversation === false) {
          releaseText(index)
          return index
        }
        if (firstOnText === null) firstOnText = index
        return firstOnText
      },
      releaseText
    }),
    setRequest: nextRequest => {
      request = { ...DEFAULT_REQUEST, ...nextRequest }
    },
    startNewText: () => {
      firstOnText = null
    }
  }
}
