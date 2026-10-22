import { useLocalRuntime } from '@assistant-ui/react'
import { useEffect, useState } from 'react'

import { useClient } from 'cozy-client'

import { makeConversationId } from '@/components/helpers'
import { DOCTYPE_AI_CHAT_EVENTS } from '@/doctypes'
import { makeChat } from '@/lib/chat'

/**
 * The runtime of assistant-ui on a chat of the stack (makeChat), fed by the
 * realtime events. The chat lasts as long as the component: the runtime
 * keeps its first adapter, which reads the request when it sends a message.
 *
 * @param {object} options
 * @param {string} options.conversationId
 * @param {import('@assistant-ui/react').ThreadMessageLike[]} options.messages -
 * the messages of a past conversation
 * @param {Partial<import('@/lib/chat').ChatRequest>} options.request
 * @param {number} [options.textIndex] - see makeChat
 * @returns {{ chat: ReturnType<typeof makeChat>, runtime: import('@assistant-ui/react').AssistantRuntime }}
 */
export function useChatRuntime({
  conversationId,
  messages,
  request,
  textIndex = 0
}) {
  const client = useClient()
  const [chat] = useState(() =>
    makeChat({
      client,
      conversationId,
      makeFreshConversationId: makeConversationId,
      textIndex
    })
  )

  useEffect(() => {
    chat.setRequest(request)
  }, [chat, request])

  useEffect(() => {
    const realtime = client.plugins.realtime
    const handleEvent = event => chat.events.push(event)

    realtime.subscribe('created', DOCTYPE_AI_CHAT_EVENTS, handleEvent)
    return () => {
      realtime.unsubscribe('created', DOCTYPE_AI_CHAT_EVENTS, handleEvent)
    }
  }, [client, chat])

  const runtime = useLocalRuntime(chat.adapter, { initialMessages: messages })

  return { chat, runtime }
}
