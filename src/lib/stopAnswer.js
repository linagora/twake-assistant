import Minilog from 'cozy-minilog'

const log = Minilog('🤖 [Chat]')

/**
 * Tells the stack to stop the answer when the user stops it. To call once
 * the message is posted: the stack stops the answer to the last message of
 * the conversation, and does nothing when it already has one.
 *
 * @param {object} options
 * @param {import('cozy-client/types/CozyClient').default} options.client
 * @param {string} options.conversationId
 * @param {AbortSignal} [options.abortSignal] - aborted when the user stops
 */
export function stopAnswerOnAbort({ client, conversationId, abortSignal }) {
  if (!abortSignal) return

  const stop = () => {
    // assistant-ui aborts the run with `detach` when the user leaves the
    // conversation: the answer goes on, to be found in the history
    if (abortSignal.reason?.detach) return
    client.stackClient
      .fetchJSON('POST', `/ai/chat/conversations/${conversationId}/cancel`)
      .catch(error => log.error('The answer could not be stopped', error))
  }

  // ponytail: the stop is not awaited before the next message: one sent in
  // the same instant could be stopped instead. Await it before posting if so.
  if (abortSignal.aborted) stop()
  else abortSignal.addEventListener('abort', stop, { once: true })
}
