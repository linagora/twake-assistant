import log from 'cozy-logger'

/**
 * Not console.warn: the stack logs every stderr line of a service as an
 * error, while it reads cozy-logger's stdout at the warn level.
 */
export const logWarning = (message, detail) => {
  const suffix =
    detail === undefined
      ? ''
      : `: ${detail instanceof Error ? detail.message : JSON.stringify(detail)}`
  log('warn', `${message}${suffix}`)
}
