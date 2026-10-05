import { getIntentConfig } from '@/lib/intent'

describe('getIntentConfig', () => {
  it('reads the text, the actions and the theme of the app', () => {
    expect(
      getIntentConfig({
        content: 'Bonjour',
        answerActions: [{ name: 'insert', label: 'Insérer' }, { name: 'copy' }],
        theme: { type: 'dark' }
      })
    ).toEqual({
      content: 'Bonjour',
      answerActions: [
        { name: 'insert', label: 'Insérer' },
        { name: 'copy', label: null }
      ],
      theme: { type: 'dark' }
    })
  })

  it.each([null, undefined, {}])('has defaults without data (%p)', data => {
    expect(getIntentConfig(data)).toEqual({
      content: '',
      answerActions: [],
      theme: { type: null }
    })
  })

  it('leaves out what it cannot read', () => {
    expect(
      getIntentConfig({
        content: 12,
        answerActions: ['insert', null, { label: 'No name' }, { name: '' }],
        theme: { type: 'blue' }
      })
    ).toEqual({ content: '', answerActions: [], theme: { type: null } })
    expect(getIntentConfig({ answerActions: null }).answerActions).toEqual([])
    expect(getIntentConfig({ answerActions: 'insert' }).answerActions).toEqual(
      []
    )
  })
})
