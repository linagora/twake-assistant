import { renderHook } from '@testing-library/react'

import { useIsInLatestExchange } from '@/components/Scribe/useLatestExchange'

let mockMessage = null
let mockThread = { messages: [] }

jest.mock('@assistant-ui/react', () => ({
  useMessage: selector => selector(mockMessage),
  useThread: selector => selector(mockThread)
}))

const request = id => ({ id, role: 'user' })
const answer = id => ({ id, role: 'assistant' })

function isInLatestExchange(id, messages) {
  mockMessage = messages.find(message => message.id === id)
  mockThread = { messages }
  return renderHook(() => useIsInLatestExchange()).result.current
}

describe('useIsInLatestExchange', () => {
  it('takes the last request and its answer', () => {
    const messages = [request('q1'), answer('a1'), request('q2'), answer('a2')]

    expect(isInLatestExchange('q1', messages)).toBe(false)
    expect(isInLatestExchange('a1', messages)).toBe(false)
    expect(isInLatestExchange('q2', messages)).toBe(true)
    expect(isInLatestExchange('a2', messages)).toBe(true)
  })

  it('takes every step of the tool calls of the last request', () => {
    const messages = [
      request('q1'),
      answer('a1'),
      request('q2'),
      answer('step1'),
      answer('step2'),
      answer('a2')
    ]

    expect(isInLatestExchange('a1', messages)).toBe(false)
    expect(isInLatestExchange('q2', messages)).toBe(true)
    expect(isInLatestExchange('step1', messages)).toBe(true)
    expect(isInLatestExchange('step2', messages)).toBe(true)
    expect(isInLatestExchange('a2', messages)).toBe(true)
  })

  it('takes the last request alone while it waits for its answer', () => {
    const messages = [request('q1'), answer('a1'), request('q2')]

    expect(isInLatestExchange('a1', messages)).toBe(false)
    expect(isInLatestExchange('q2', messages)).toBe(true)
  })
})
