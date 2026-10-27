import log from 'cozy-logger'

import { logWarning } from './logWarning'

jest.mock('cozy-logger', () => jest.fn())

describe('logWarning', () => {
  beforeEach(() => log.mockReset())

  it('logs the message alone', () => {
    logWarning('folder /Docs does not exist')
    expect(log).toHaveBeenCalledWith('warn', 'folder /Docs does not exist')
  })

  it('ends the message with the message of an error', () => {
    logWarning('failed', new Error('boom'))
    expect(log).toHaveBeenCalledWith('warn', 'failed: boom')
  })

  it('ends the message with a value as JSON', () => {
    logWarning('skipped entries', [{ id: 'docs', reason: 'nope' }])
    expect(log).toHaveBeenCalledWith(
      'warn',
      'skipped entries: [{"id":"docs","reason":"nope"}]'
    )
  })
})
