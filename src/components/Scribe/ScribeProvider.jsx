import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useClient } from 'cozy-client'

import { DOCTYPE_AI_CHAT_EVENTS } from '@/doctypes'
import { makeScribeChat } from '@/lib/scribeChat'

const ScribeContext = createContext(null)

export function useScribe() {
  return useContext(ScribeContext)
}

function sendAsItIs(text) {
  return text
}

/**
 * The conversation of a scribe: its messages go to the chat of the stack,
 * and the answers come back with the realtime events.
 *
 * @param {object} props
 * @param {string} props.conversationId
 * @param {import('@/lib/scribe').Suggestion[]} [props.suggestions] - the
 * prompts offered above the composer of an empty conversation
 * @param {import('@/lib/scribe').AnswerAction[]} [props.answerActions] - the
 * buttons under each answer
 * @param {Function} [props.prepareQuery] - turns the text of a message into
 * the query sent to the stack
 * @param {Function} [props.preparePrompt] - the query and the instructions of
 * a prompt of the catalogue, for a message sent by a suggestion
 * @param {string} [props.instructions] - how to answer, sent to the LLM as a
 * system message with each message
 * @param {string} [props.text] - the text of the app the requests are about.
 * When the app gives another one, the next request is about it.
 */
export function ScribeProvider({
  conversationId,
  suggestions = [],
  answerActions = [],
  prepareQuery = sendAsItIs,
  preparePrompt = null,
  instructions = null,
  text = '',
  children
}) {
  const client = useClient()
  // The answers come from the LLM alone until the user asks for their
  // documents
  const [hasDocuments, setHasDocuments] = useState(false)
  // The chat lasts as long as the scribe: the runtime keeps its first
  // adapter, which reads how to send a message when it sends it
  const [chat] = useState(() => makeScribeChat({ client, conversationId }))

  useEffect(() => {
    chat.setRequest({ prepareQuery, preparePrompt, hasDocuments, instructions })
  }, [chat, prepareQuery, preparePrompt, hasDocuments, instructions])

  useEffect(() => {
    const realtime = client.plugins.realtime
    const handleEvent = event => chat.events.push(event)

    realtime.subscribe('created', DOCTYPE_AI_CHAT_EVENTS, handleEvent)
    return () => {
      realtime.unsubscribe('created', DOCTYPE_AI_CHAT_EVENTS, handleEvent)
    }
  }, [client, chat])

  const runtime = useLocalRuntime(chat.adapter)

  // The text, and the number of requests of the user when it was given: the
  // prompts are offered until the next request. Read while rendering, as
  // React advises for a state derived from a prop.
  const [given, setGiven] = useState({ text, start: 0 })
  if (given.text !== text) {
    const { messages } = runtime.thread.getState()
    const start = messages.filter(message => message.role === 'user').length
    setGiven({ text, start })
  }
  const textStart = given.start

  const textRef = useRef(text)
  useEffect(() => {
    if (text === textRef.current) return
    textRef.current = text
    chat.startNewText()
  }, [text, chat])

  const value = useMemo(
    () => ({
      suggestions,
      answerActions,
      hasDocuments,
      setHasDocuments,
      textStart
    }),
    [suggestions, answerActions, hasDocuments, textStart]
  )

  return (
    <ScribeContext.Provider value={value}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </ScribeContext.Provider>
  )
}
