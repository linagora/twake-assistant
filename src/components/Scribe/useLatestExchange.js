import { useMessage, useThread } from '@assistant-ui/react'

/**
 * @returns {boolean} whether the message is the last one of the thread, or
 * the one before it: the request that the last answer answers
 */
export function useIsInLatestExchange() {
  const messageId = useMessage(message => message.id)
  // A boolean, not the ids: the selector of useThread must return the same
  // value for the same state
  return useThread(state =>
    state.messages.slice(-2).some(message => message.id === messageId)
  )
}
