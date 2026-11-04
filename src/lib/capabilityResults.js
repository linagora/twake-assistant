// After it, the assistant stops waiting: the app gives no result for the call
const RESULT_TIMEOUT = 30000

// The result the data give for this call, or null when they give none, as
// the data of another text selected meanwhile
function readCapabilityResult(data, callId) {
  const result = data?.capabilityResult
  if (result?.callId !== callId || typeof result.ok !== 'boolean') return null
  return {
    ok: result.ok,
    content: typeof result.content === 'string' ? result.content : ''
  }
}

/**
 * Waits for the result the app gives for a call of one of its capabilities,
 * in new data (see `capabilityResult` in docs/assistant-intent.md)
 *
 * @param {object} service - the service of the intent
 * @param {(listener: (data: object) => void) => () => void} service.onData
 * @returns {(callId: string) => Promise<{ ok: boolean, content: string }|null>}
 * It listens at once, so that it is called before the call is handed to the
 * app. null when the app does not give the result in time.
 */
export function makeCapabilityResults({ onData }) {
  return callId =>
    new Promise(resolve => {
      let timeout = null
      let stopListening = null
      const finish = result => {
        clearTimeout(timeout)
        stopListening()
        resolve(result)
      }

      timeout = setTimeout(() => finish(null), RESULT_TIMEOUT)
      stopListening = onData(data => {
        const result = readCapabilityResult(data, callId)
        if (result) finish(result)
      })
    })
}
