import { ChatEventError, classifyChatError } from '@/lib/chatErrors'

// The error cozy-stack-client throws when the stack answers with an HTTP error
const fetchError = (status, message = 'Refused') =>
  Object.assign(new Error(message), { name: 'FetchError', status })

describe('classifyChatError', () => {
  it('tells an authorization error from its status', () => {
    expect(classifyChatError(fetchError(401, 'Invalid token'))).toEqual({
      kind: 'auth',
      status: 401,
      message: 'Invalid token'
    })
    expect(classifyChatError(fetchError(403)).kind).toBe('auth')
  })

  it('tells too many requests from the status or the realtime message', () => {
    expect(classifyChatError(fetchError(429))).toEqual({
      kind: 'rate_limit',
      status: 429,
      message: 'Refused'
    })
    expect(
      classifyChatError(new ChatEventError('RateLimitError: slow down'))
    ).toEqual({ kind: 'rate_limit', message: 'RateLimitError: slow down' })
    expect(classifyChatError(new ChatEventError('Error code: 429')).kind).toBe(
      'rate_limit'
    )
  })

  it('tells a context too large from the status or the realtime message', () => {
    expect(classifyChatError(fetchError(413)).kind).toBe('context_too_large')
    expect(
      classifyChatError(
        new ChatEventError("This model's maximum context length is 8192")
      ).kind
    ).toBe('context_too_large')
    expect(
      classifyChatError(new ChatEventError('Too many tokens in the request'))
        .kind
    ).toBe('context_too_large')
  })

  it('tells a server error from the status or any other realtime error', () => {
    expect(classifyChatError(fetchError(500)).kind).toBe('server')
    expect(classifyChatError(fetchError(503)).kind).toBe('server')
    expect(classifyChatError(new ChatEventError('Overloaded'))).toEqual({
      kind: 'server',
      message: 'Overloaded'
    })
  })

  it('tells a network error', () => {
    expect(classifyChatError(new TypeError('Failed to fetch'))).toEqual({
      kind: 'network',
      message: 'Failed to fetch'
    })
    expect(classifyChatError(new TypeError('Load failed')).kind).toBe('network')
    expect(classifyChatError(new Error('Network request failed')).kind).toBe(
      'network'
    )
  })

  it('tells a generic error for another status or another error', () => {
    expect(classifyChatError(fetchError(400, 'Bad Request'))).toEqual({
      kind: 'generic',
      status: 400,
      message: 'Bad Request'
    })
    expect(
      classifyChatError(new Error('No message in the conversation'))
    ).toEqual({ kind: 'generic', message: 'No message in the conversation' })
  })

  it('treats an error without a message as a server error', () => {
    expect(classifyChatError(new ChatEventError(undefined))).toEqual({
      kind: 'server'
    })
    expect(classifyChatError(new ChatEventError({ code: 'busy' }))).toEqual({
      kind: 'server'
    })
    expect(classifyChatError(new Error())).toEqual({ kind: 'server' })
  })
})
