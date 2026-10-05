import { getIntentConfig } from '@/lib/intent'

describe('getIntentConfig', () => {
  it('reads the theme of the app', () => {
    expect(getIntentConfig({ theme: { type: 'dark' } })).toEqual({
      theme: { type: 'dark' }
    })
  })

  it.each([null, undefined, {}])('has defaults without data (%p)', data => {
    expect(getIntentConfig(data)).toEqual({ theme: { type: null } })
  })

  it('leaves out what it cannot read', () => {
    expect(getIntentConfig({ theme: { type: 'blue' } })).toEqual({
      theme: { type: null }
    })
    expect(getIntentConfig({ theme: 'dark' })).toEqual({
      theme: { type: null }
    })
  })
})
