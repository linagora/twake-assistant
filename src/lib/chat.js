import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import unified from 'unified'

import Minilog from 'cozy-minilog'

import { ChatEventError, classifyChatError } from '@/lib/chatErrors'
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

// WORKAROUND, to remove once cozy-stack sends a call without a result as a
// tool call in the history: it writes it there as text, "(Proposed to the
// user: name {params})" (describeAction of model/rag/actions.go), and the LLM
// then writes its next call in that text instead of calling the tool.
const PROPOSED_CALL_START = '(Proposed to the user:'
const PROPOSED_CALL =
  /^\(Proposed to the user: ([\w-]+) (\{.*\})\)(?:\s+([\s\S]*))?$/

/**
 * @param {string} text - an answer of the LLM
 * @param {object[]|null} [tools] - the tools of the request: a call of
 * another one is no call
 * @returns {{ action: { name: string, params: object }, text: string }|null}
 * the call, and the text written after it
 */
export function readProposedCall(text, tools = null) {
  const match = PROPOSED_CALL.exec(text.trim())
  if (!match) return null
  const tool = tools?.find(({ name }) => name === match[1])
  if (tools && !tool) return null
  let params
  try {
    params = JSON.parse(match[2])
  } catch {
    return null
  }
  if (typeof params !== 'object' || params === null || Array.isArray(params))
    return null
  // The stack checks the params of a call; this one did not go through it.
  // ponytail: names only, not the types nor the user-written values
  const schema = tool?.parameters
  if (schema?.required?.some(name => params[name] == null)) return null
  if (schema?.properties) {
    params = Object.fromEntries(
      Object.entries(params).filter(([name]) => name in schema.properties)
    )
  }
  return { action: { name: match[1], params }, text: match[3] ?? '' }
}

// While it comes, an answer that may be such a call shows nothing
function hideProposedCall(text) {
  const start = text.trimStart()
  return start !== '' &&
    (start.startsWith(PROPOSED_CALL_START) ||
      PROPOSED_CALL_START.startsWith(start))
    ? ''
    : text
}

// WORKAROUND for linagora/cozy-stack#5291, see makeChatAdapter. Keep it
// after the workaround is removed: the conversations saved meanwhile hold
// the instructions in their queries.
const QUERY_INSTRUCTIONS =
  /^\[Instructions\]\n[\s\S]*?\n\[End of instructions\]\n\n/

/**
 * @param {string} query - the content of a message kept by the stack
 * @returns {string} the query without the instructions at its head
 */
export function removeQueryInstructions(query) {
  return query.replace(QUERY_INSTRUCTIONS, '')
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
// sent, a request of the user or the result of a call given by the app,
// whose id is the one of the events of its answer
function getMessageId(response) {
  const messages = response?.data?.attributes?.messages ?? []
  const message = messages.findLast(
    message => message.role === 'user' || message.role === 'tool'
  )
  if (!message?.id) throw new Error('No message in the conversation')

  return message.id
}

// The call keeps the id of the message the stack saves it on: the result of
// the call goes back to the stack with it
function readAction(event) {
  if (!event.action) return null
  return typeof event.message_id === 'string'
    ? { ...event.action, messageId: event.message_id }
    : event.action
}

function getDocumentNotice(doc) {
  if (doc === null) return 'unavailable'
  return doc.isTruncated ? 'truncated' : null
}

// Without it, assistant-ui takes an answer stopped for a complete one
const STOPPED = { status: { type: 'incomplete', reason: 'cancelled' } }

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
 * @property {(text: string, context: { isFirstOnText: boolean, document: string|null }) => string} prepareQuery -
 * turns the text of a message into the query sent to the stack:
 * `isFirstOnText` for the first message about the text of the app,
 * `document` the whole document of the app when the user includes it
 * @property {boolean} hasDocuments - whether the answer comes from the
 * documents of the user
 * @property {boolean} [hasDocument] - whether a typed request includes the
 * whole document of the app, a prompt of the catalogue never does
 * @property {string} [text] - the text of the app
 * @property {((index: number, text: string) => void)|null} [recordSentText] -
 * called with the index of a message, among the messages of the user, and
 * the text of the app when that message sends it
 * @property {(() => Promise<{ document: string, isTruncated: boolean }|null>)|null} [requestDocument] -
 * asks the app for its document, null when it cannot give it: no request
 * includes the document then
 * @property {string|null} instructions - how to answer, sent to the LLM as a
 * system message
 * @property {string|null} [rules] - the rules of the app, joined to the
 * system message of every request, a prompt of the catalogue included
 * @property {(name: string) => { q: string, instructions: string|null }|null} [preparePrompt] -
 * the query and the instructions of a prompt of the catalogue, for a message
 * sent by a suggestion
 * @property {object[]} actions - the tools of the app, the `tools` of the
 * chat of cozy-stack
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
 * @returns {import('@assistant-ui/react').ChatModelAdapter}
 */
export function makeChatAdapter({
  client,
  conversationId,
  events,
  getRequest,
  getTextIndex = () => 0,
  releaseText = () => {}
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
      // A prompt of the catalogue, from a suggestion, brings its own query
      // and instructions, about the text of the app only. A past question
      // asked again brings the query it sent, its text and document in it.
      const custom = runConfig?.custom ?? {}
      const isFirstOnText = !custom.query && index === getTextIndex(index)
      // The result of a call the app gives: the LLM goes on with it, in
      // place of a request of the user
      const result = custom.result ?? null
      const prompt = custom.prompt ? preparePrompt?.(custom.prompt) : null
      const isDocumentIncluded =
        hasDocument &&
        Boolean(requestDocument) &&
        !custom.prompt &&
        !custom.query &&
        !result
      let doc = null
      if (isDocumentIncluded) {
        // The app may take seconds to answer, or never: Stop does not wait
        doc =
          (await Promise.race([
            requestDocument(),
            waitForAbort(abortSignal)
          ])) ?? null
        if (abortSignal?.aborted) {
          releaseText(index)
          yield STOPPED
          return
        }
      }
      const query = result
        ? null
        : (custom.query ??
          prompt?.q ??
          prepareQuery(text, {
            isFirstOnText,
            document: doc?.document ?? null
          }))
      const isTextSent = !result && (Boolean(prompt) || isFirstOnText)
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
      // WORKAROUND, to remove once linagora/cozy-stack#5291 is deployed in
      // production: without documents the stack passes system messages as
      // they are and adds its own for the tools; Mistral refuses a second one.
      // Until the stack joins them, the instructions go at the head of the
      // query. A result sends none: they came with its query. To remove:
      // isSystemInQuery and q, back to `q: query` and `instructions: system`.
      const isSystemInQuery =
        !hasDocuments && actions?.length > 0 && system !== ''
      const q =
        isSystemInQuery && query !== null
          ? `[Instructions]\n${system}\n[End of instructions]\n\n${query}`
          : query
      const answer = makeAnswer()
      const reasoning = makeAnswer()
      const getContent = ({
        isWhole = false,
        text = actions?.length > 0
          ? hideProposedCall(answer.getText({ isWhole }))
          : answer.getText({ isWhole })
      } = {}) => {
        const thought = reasoning.getText({ isWhole })
        return [
          ...(thought !== '' ? [{ type: 'reasoning', text: thought }] : []),
          { type: 'text', text }
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
          `/ai/chat/conversations/${conversationId}`,
          {
            ...(result ? { result } : { q }),
            // The LLM answers alone, unless the user asks for their documents
            ...(!hasDocuments && { documents: false }),
            ...(system && !isSystemInQuery && { instructions: system }),
            ...(actions?.length > 0 && { tools: actions }),
            ...(assistantId && { assistantID: assistantId }),
            ...(websearch && { websearch: true })
          }
        )
        stopAnswerOnAbort({
          client,
          conversationId,
          abortSignal
        })

        for await (const event of events.read(
          getMessageId(response),
          abortSignal
        )) {
          if (event.object === 'error') throw new ChatEventError(event.message)
          if (event.object === 'sources') sources = event.content
          if (event.object === 'action') action = readAction(event)
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
        if (abortSignal?.aborted) {
          yield STOPPED
          return
        }

        let answerText = answer.getText({ isWhole: true })
        const proposed = action ? null : readProposedCall(answerText, actions)
        if (proposed) {
          action = proposed.action
          answerText = proposed.text
        }
        yield {
          content: getContent({ isWhole: true, text: answerText }),
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
              error: classifyChatError(error),
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
export function makeChat({ client, conversationId, textIndex = 0 }) {
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
      getTextIndex: index => {
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
