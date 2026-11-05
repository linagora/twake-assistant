import { makeCapabilityResults } from '@/lib/capabilityResults'

function setup() {
  const listeners = new Set()
  const service = {
    onData: jest.fn(listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    })
  }

  return {
    waitForResult: makeCapabilityResults(service),
    listeners,
    sendData: data => listeners.forEach(listener => listener(data))
  }
}

async function isPending(promise) {
  const pending = {}
  return (await Promise.race([promise, pending])) === pending
}

describe('makeCapabilityResults', () => {
  afterEach(() => jest.useRealTimers())

  it('resolves with the result the app gives for the call', async () => {
    const { waitForResult, listeners, sendData } = setup()

    const result = waitForResult('m4')
    sendData({
      content: '',
      capabilityResult: { callId: 'm4', ok: true, content: '3 emails' }
    })

    await expect(result).resolves.toEqual({ ok: true, content: '3 emails' })
    expect(listeners.size).toBe(0)
  })

  it('resolves with a result that says the call failed', async () => {
    const { waitForResult, sendData } = setup()

    const result = waitForResult('m4')
    sendData({ capabilityResult: { callId: 'm4', ok: false } })

    await expect(result).resolves.toEqual({ ok: false, content: '' })
  })

  it('ignores the data without a result for the call', async () => {
    const { waitForResult, sendData } = setup()

    const result = waitForResult('m4')
    sendData({ content: 'Another text' })
    sendData({ capabilityResult: { callId: 'm2', ok: true, content: 'Old' } })
    sendData({ capabilityResult: { callId: 'm4', ok: 'yes' } })
    expect(await isPending(result)).toBe(true)
    sendData({ capabilityResult: { callId: 'm4', ok: true, content: 'New' } })

    await expect(result).resolves.toEqual({ ok: true, content: 'New' })
  })

  it('waits for each call on its own', async () => {
    const { waitForResult, sendData } = setup()

    const first = waitForResult('m2')
    const second = waitForResult('m4')
    sendData({ capabilityResult: { callId: 'm4', ok: true, content: 'B' } })
    sendData({ capabilityResult: { callId: 'm2', ok: true, content: 'A' } })

    await expect(first).resolves.toEqual({ ok: true, content: 'A' })
    await expect(second).resolves.toEqual({ ok: true, content: 'B' })
  })

  it('resolves null after 30 s', async () => {
    jest.useFakeTimers()
    const { waitForResult, listeners } = setup()

    const result = waitForResult('m4')
    jest.advanceTimersByTime(29999)
    expect(await isPending(result)).toBe(true)
    jest.advanceTimersByTime(1)

    await expect(result).resolves.toBe(null)
    expect(listeners.size).toBe(0)
  })
})
