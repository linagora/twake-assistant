import { initTranslation } from 'twake-i18n'

import {
  makeScribeAnswerActions,
  makeScribePrepareQuery,
  makeScribeSuggestions
} from '@/lib/scribe'
import en from '@/locales/en.json'

const polyglot = initTranslation('en', () => en)
const mockT = polyglot.t.bind(polyglot)

describe('makeScribeSuggestions', () => {
  it('offers a translation into each language, then the other prompts', () => {
    const suggestions = makeScribeSuggestions(mockT)

    expect(suggestions.map(suggestion => suggestion.name)).toEqual([
      'translate',
      'summarize',
      'improve',
      'fix',
      'shorten',
      'expand'
    ])
    expect(suggestions[0].options[0]).toEqual({
      name: 'en',
      label: 'English',
      prompt: en.scribe.suggestions.translate.en.prompt
    })
    expect(suggestions[1].prompt).toBe(en.scribe.suggestions.summarize.prompt)
  })
})

describe('makeScribePrepareQuery', () => {
  const prepareQuery = makeScribePrepareQuery('Bonjour à tous', mockT)

  it('joins the text of the app to the first message', () => {
    expect(prepareQuery('Translate', { isFirstOnText: true })).toBe(
      'Translate\n\nText:\n"""\nBonjour à tous\n"""'
    )
  })

  it('sends a later message as it is', () => {
    expect(prepareQuery('Shorter', { isFirstOnText: false })).toBe('Shorter')
  })
})

describe('makeScribeAnswerActions', () => {
  it('hands the answer and the action clicked', () => {
    const onAction = jest.fn()
    const [insert, replace] = makeScribeAnswerActions(
      [
        { name: 'insert', label: null },
        { name: 'replace', label: null }
      ],
      mockT,
      onAction
    )

    expect(insert.label).toBe('Insert')
    expect(replace.label).toBe('Replace')
    replace.onClick('Hello everyone')
    expect(onAction).toHaveBeenCalledWith({
      answerAction: 'replace',
      text: 'Hello everyone',
      format: 'markdown'
    })
  })

  it('names an action as the app does', () => {
    const [action] = makeScribeAnswerActions(
      [{ name: 'insert', label: 'Add to the note' }],
      mockT,
      jest.fn()
    )

    expect(action.label).toBe('Add to the note')
  })

  it('names an unknown action after itself', () => {
    const [action] = makeScribeAnswerActions(
      [{ name: 'create_task', label: null }],
      mockT,
      jest.fn()
    )

    expect(action.label).toBe('create_task')
  })
})
