/**
 * The error event of the realtime, which ends an answer the stack accepted
 */
export class ChatEventError extends Error {
  /**
   * @param {unknown} message - the message of the event, which the stack may
   * leave out
   */
  constructor(message) {
    super(typeof message === 'string' ? message : '')
    this.name = 'ChatEventError'
  }
}

/**
 * The kinds of errors that may go away when the answer is asked again
 */
export const RETRYABLE_KINDS = ['rate_limit', 'server', 'network', 'generic']

const NETWORK_MESSAGE = /Failed to fetch|Network request failed/

function getKindOfStatus(status) {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limit'
  if (status === 413) return 'context_too_large'
  if (status >= 500) return 'server'
  return 'generic'
}

function getKindOfEventMessage(message) {
  if (/429|rate/i.test(message)) return 'rate_limit'
  if (/context|token/i.test(message)) return 'context_too_large'
  return 'server'
}

function getKindOfError(error, message) {
  if (error instanceof ChatEventError) return getKindOfEventMessage(message)
  if (error instanceof TypeError || NETWORK_MESSAGE.test(message)) {
    return 'network'
  }
  return message === '' ? 'server' : 'generic'
}

/**
 * @typedef {'auth'|'rate_limit'|'context_too_large'|'server'|'network'|'generic'} ChatErrorKind
 */

/**
 * @param {unknown} error - what a request to the chat of the stack threw: a
 * FetchError of cozy-stack-client with the HTTP status, a ChatEventError, or
 * the TypeError of a fetch without network
 * @returns {{ kind: ChatErrorKind, status?: number, message?: string }}
 */
export function classifyChatError(error) {
  const status = typeof error?.status === 'number' ? error.status : null
  const message = typeof error?.message === 'string' ? error.message : ''

  return {
    kind:
      status !== null
        ? getKindOfStatus(status)
        : getKindOfError(error, message),
    ...(status !== null && { status }),
    ...(message !== '' && { message })
  }
}
