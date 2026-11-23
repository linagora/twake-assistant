import { checkIfBaseUrlInvalid } from './helpers'

describe('checkIfBaseUrlInvalid', () => {
  it.each(['not a url', 'javascript:alert(1)', 'ftp://example.com'])(
    'rejects %s',
    baseUrl => {
      expect(checkIfBaseUrlInvalid(baseUrl)).toBe(true)
    }
  )

  it.each(['https://api.example.com/v1', ' http://localhost:11434/v1 '])(
    'accepts %s',
    baseUrl => {
      expect(checkIfBaseUrlInvalid(baseUrl)).toBe(false)
    }
  )
})
