import Minilog from 'cozy-minilog'

import { ChatEventStream } from '@/lib/chatEvents'

const log = Minilog('🤖 [Scribe]')

// The marks of the sources the LLM leaves in an answer from the documents:
// [REF]doc_1[/REF], [doc_1], [Source 1, 2], [Sources: 1, 2]
const SOURCE_MARKS = [
  /\s?\[REF\][\s\S]*?\[\/REF\]/g,
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
    // What can be shown: the pieces before the first one still awaited
    getText: () => {
      const missing = Array.from(chunks).findIndex(chunk => chunk === undefined)
      const known = missing === -1 ? chunks : chunks.slice(0, missing)
      return removeSourceMarks(known.join(''))
    }
  }
}

/**
 * @typedef {object} ScribeRequest
 * @property {(text: string, context: { isFirstMessage: boolean }) => string} prepareQuery -
 * turns the text of a message into the query sent to the stack
 * @property {boolean} hasDocuments - whether the answer comes from the
 * documents of the user
 * @property {string|null} instructions - how to answer, sent to the LLM as a
 * system message
 */

/**
 * The link between the conversation of the scribe (assistant-ui) and the
 * chat of the stack: a message is posted to the conversation, and its answer
 * comes with the realtime events.
 *
 * @param {object} options
 * @param {import('cozy-client/types/CozyClient').default} options.client
 * @param {string} options.conversationId
 * @param {import('./chatEvents').ChatEventStream} options.events
 * @param {() => ScribeRequest} options.getRequest - how to send a message,
 * read when it is sent: the user changes it between two messages
 * @returns {import('@assistant-ui/react').ChatModelAdapter}
 */
export function makeScribeChatAdapter({
  client,
  conversationId,
  events,
  getRequest
}) {
  return {
    async *run({ messages, abortSignal }) {
      const text = findLastUserText(messages)
      if (text === null) return

      const { prepareQuery, hasDocuments, instructions } = getRequest()
      const isFirstMessage =
        messages.filter(message => message.role === 'user').length === 1
      const answer = makeAnswer()
      let sources = null

      try {
        events.clear()
        const response = await client.stackClient.fetchJSON(
          'POST',
          `/ai/chat/conversations/${conversationId}`,
          {
            q: prepareQuery(text, { isFirstMessage }),
            // The LLM answers alone, unless the user asks for their documents
            ...(!hasDocuments && { documents: false }),
            ...(instructions && { instructions })
          }
        )

        for await (const event of events.read(
          getMessageId(response),
          abortSignal
        )) {
          if (event.object === 'error') throw new Error(event.message)
          if (event.object === 'sources') sources = event.content
          if (event.object === 'delta') {
            answer.add(event)
            yield { content: [{ type: 'text', text: answer.getText() }] }
          }
        }

        // The user has stopped the answer: what came stays as it is
        if (abortSignal?.aborted) return

        const answerText = answer.getText()
        yield {
          content: [{ type: 'text', text: answerText }],
          status: { type: 'complete', reason: 'stop' },
          metadata: {
            custom: {
              ...(answerText.trim() === '' && { isEmpty: true }),
              ...(sources?.length > 0 && { sources })
            }
          }
        }
      } catch (error) {
        log.error('The scribe got no answer', error)
        yield {
          content: [{ type: 'text', text: answer.getText() }],
          status: { type: 'incomplete', reason: 'error' },
          metadata: { custom: { isError: true } }
        }
      }
    }
  }
}

/**
 * The chat of a scribe: the stream of the events of its answers, and the
 * adapter of its conversation, which sends each message as the request of
 * the moment says
 *
 * @param {object} options
 * @param {import('cozy-client/types/CozyClient').default} options.client
 * @param {string} options.conversationId
 * @returns {{
 *   events: ChatEventStream,
 *   adapter: import('@assistant-ui/react').ChatModelAdapter,
 *   setRequest: (request: ScribeRequest) => void
 * }}
 */
export function makeScribeChat({ client, conversationId }) {
  const events = new ChatEventStream()
  let request = {
    prepareQuery: text => text,
    hasDocuments: false,
    instructions: null
  }

  return {
    events,
    adapter: makeScribeChatAdapter({
      client,
      conversationId,
      events,
      getRequest: () => request
    }),
    setRequest: nextRequest => {
      request = nextRequest
    }
  }
}
