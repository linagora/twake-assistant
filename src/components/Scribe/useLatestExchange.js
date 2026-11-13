import { useMessage, useThread } from '@assistant-ui/react'

/**
 * @returns {boolean} whether the message is in the latest exchange: the last
 * request of the user and every message after it, as the steps of its tool
 * calls and the answer
 */
export function useIsInLatestExchange() {
  const messageId = useMessage(message => message.id)
  // A boolean, not the ids: the selector of useThread must return the same
  // value for the same state
  return useThread(state => {
    const start = state.messages.findLastIndex(
      message => message.role === 'user'
    )
    return state.messages
      .slice(Math.max(start, 0))
      .some(message => message.id === messageId)
  })
}
