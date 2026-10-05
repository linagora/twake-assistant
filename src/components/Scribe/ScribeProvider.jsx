import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react'
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
 * @param {string} [props.instructions] - how to answer, sent to the LLM as a
 * system message with each message
 */
export function ScribeProvider({
  conversationId,
  suggestions = [],
  answerActions = [],
  prepareQuery = sendAsItIs,
  instructions = null,
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
    chat.setRequest({ prepareQuery, hasDocuments, instructions })
  }, [chat, prepareQuery, hasDocuments, instructions])

  useEffect(() => {
    const realtime = client.plugins.realtime
    const handleEvent = event => chat.events.push(event)

    realtime.subscribe('created', DOCTYPE_AI_CHAT_EVENTS, handleEvent)
    return () => {
      realtime.unsubscribe('created', DOCTYPE_AI_CHAT_EVENTS, handleEvent)
    }
  }, [client, chat])

  const runtime = useLocalRuntime(chat.adapter)

  const value = useMemo(
    () => ({ suggestions, answerActions, hasDocuments, setHasDocuments }),
    [suggestions, answerActions, hasDocuments]
  )

  return (
    <ScribeContext.Provider value={value}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </ScribeContext.Provider>
  )
}
