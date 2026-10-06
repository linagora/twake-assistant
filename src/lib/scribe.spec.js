import { initTranslation } from 'twake-i18n'

import {
  makeScribeAnswerActions,
  makeScribePreparePrompt,
  makeScribePrepareQuery,
  makeScribeSuggestions
} from '@/lib/scribe'
import catalogue from '@/lib/scribePrompts.json'
import en from '@/locales/en.json'

const polyglot = initTranslation('en', () => en)
const mockT = polyglot.t.bind(polyglot)

describe('makeScribeSuggestions', () => {
  it('arranges the prompts of the catalogue as the scribe of Twake Mail', () => {
    const suggestions = makeScribeSuggestions(mockT)

    expect(suggestions.map(suggestion => suggestion.name)).toEqual([
      'correct',
      'improve',
      'tone',
      'translate',
      'summarize'
    ])
    expect(suggestions[0]).toEqual({
      name: 'correct',
      label: 'Correct',
      request: 'Correct the grammar and spelling of the text.',
      prompt: 'correct-grammar'
    })
    expect(suggestions[3].label).toBe('Translate')
    expect(suggestions[3].options.map(option => option.prompt)).toEqual([
      'translate-french',
      'translate-english',
      'translate-russian',
      'translate-vietnamese'
    ])
  })

  it('only offers prompts the catalogue has', () => {
    const names = catalogue.prompts.map(prompt => prompt.name)
    const prompts = makeScribeSuggestions(mockT).flatMap(
      suggestion => suggestion.options ?? [suggestion]
    )

    prompts.forEach(suggestion => {
      expect(names).toContain(suggestion.prompt)
      expect(suggestion.request).not.toMatch(/^scribe\./)
    })
  })
})

describe('makeScribePreparePrompt', () => {
  const preparePrompt = makeScribePreparePrompt('Bonjour à tous, $1 et $&')

  it('gives the text in the user message of the prompt, and its system message', () => {
    const { q, instructions } = preparePrompt('correct-grammar')
    const { messages } = catalogue.prompts.find(
      ({ name }) => name === 'correct-grammar'
    )
    const { content } = messages.find(({ role }) => role === 'user')

    expect(q).toBe(content.split('{{input}}').join('Bonjour à tous, $1 et $&'))
    expect(q).toContain('Correct the grammar and spelling of the text.')
    expect(instructions).toMatch(
      /^You are a text editing assistant, NOT a chatbot\./
    )
  })

  it('gives nothing for a prompt the catalogue does not have', () => {
    expect(preparePrompt('unknown')).toBe(null)
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
