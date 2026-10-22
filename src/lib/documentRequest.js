import { getIntentConfig } from '@/lib/intent'

// After it, the request goes without the document
const DOCUMENT_TIMEOUT = 8000

/**
 * Asks the app for its whole document, which it gives in new data (see
 * `document` in docs/assistant-intent.md)
 *
 * @param {object} service - the service of the intent
 * @param {(result: object) => void} service.sendResult
 * @param {(listener: (data: object) => void) => () => void} service.onData
 * @returns {() => Promise<{ document: string, isTruncated: boolean }|null>}
 * null when the app cannot read its document or does not give it in time.
 * Asked while it waits, it waits for the same data.
 */
export function makeDocumentRequest({ sendResult, onData }) {
  let pending = null

  return () => {
    if (pending) return pending

    pending = new Promise(resolve => {
      let timeout = null
      let stopListening = null
      const finish = result => {
        clearTimeout(timeout)
        stopListening()
        pending = null
        resolve(result)
      }

      timeout = setTimeout(() => finish(null), DOCUMENT_TIMEOUT)
      stopListening = onData(data => {
        // Data without it, as another text selected, do not answer
        const { document, documentTruncated } = getIntentConfig(data)
        if (document === undefined) return
        finish(
          document === null
            ? null
            : { document, isTruncated: documentTruncated }
        )
      })
      sendResult({ request: 'document' })
    })
    return pending
  }
}
