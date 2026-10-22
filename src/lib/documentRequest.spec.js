import { makeDocumentRequest } from '@/lib/documentRequest'

function setup() {
  const listeners = new Set()
  const service = {
    sendResult: jest.fn(),
    onData: jest.fn(listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    })
  }

  return {
    requestDocument: makeDocumentRequest(service),
    service,
    listeners,
    sendData: data => listeners.forEach(listener => listener(data))
  }
}

async function isPending(promise) {
  const pending = {}
  return (await Promise.race([promise, pending])) === pending
}

describe('makeDocumentRequest', () => {
  afterEach(() => jest.useRealTimers())

  it('resolves with the document of the next data', async () => {
    const { requestDocument, service, listeners, sendData } = setup()

    const request = requestDocument()
    expect(service.sendResult).toHaveBeenCalledWith({ request: 'document' })
    sendData({
      content: 'Bonjour',
      document: 'Bonjour à tous',
      documentTruncated: true
    })

    await expect(request).resolves.toEqual({
      document: 'Bonjour à tous',
      isTruncated: true
    })
    expect(listeners.size).toBe(0)
  })

  it('ignores data without a document', async () => {
    const { requestDocument, sendData } = setup()

    const request = requestDocument()
    sendData({ content: 'Au revoir' })
    expect(await isPending(request)).toBe(true)
    sendData({ content: 'Au revoir', document: 'Au revoir à tous' })

    await expect(request).resolves.toEqual({
      document: 'Au revoir à tous',
      isTruncated: false
    })
  })

  it('resolves null after 8 s', async () => {
    jest.useFakeTimers()
    const { requestDocument, listeners } = setup()

    const request = requestDocument()
    jest.advanceTimersByTime(7999)
    expect(await isPending(request)).toBe(true)
    jest.advanceTimersByTime(1)

    await expect(request).resolves.toBe(null)
    expect(listeners.size).toBe(0)
  })

  it('resolves null when the app gives null', async () => {
    const { requestDocument, sendData } = setup()

    const request = requestDocument()
    sendData({ content: 'Bonjour', document: null })

    await expect(request).resolves.toBe(null)
  })

  it('asks the app once while a request waits', async () => {
    const { requestDocument, service, sendData } = setup()

    const request = requestDocument()
    expect(requestDocument()).toBe(request)
    expect(service.sendResult).toHaveBeenCalledTimes(1)
    sendData({ document: 'Bonjour' })
    await request
    requestDocument()

    expect(service.sendResult).toHaveBeenCalledTimes(2)
  })
})
