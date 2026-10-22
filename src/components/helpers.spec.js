import { initTranslation } from 'twake-i18n'

import {
  formatConversationDate,
  getNameOfConversation,
  getDescriptionOfConversation
} from './helpers'

import { makeScribePreparePrompt } from '@/lib/scribe'
import en from '@/locales/en.json'

jest.mock('cozy-flags', () => jest.fn(() => true), { virtual: true })

const polyglot = initTranslation('en', () => en)
const t = polyglot.t.bind(polyglot)

describe('formatConversationDate', () => {
  const mockT = jest.fn(key => key)
  const mockDate = new Date('2023-11-20T12:00:00Z')
  let OriginalDate
  let dateSpy

  beforeEach(() => {
    OriginalDate = global.Date
    dateSpy = jest.spyOn(global, 'Date').mockImplementation(function (...args) {
      if (args.length) {
        return new OriginalDate(...args)
      }
      return mockDate
    })
    dateSpy.now = jest.fn(() => mockDate.getTime())
  })

  afterEach(() => {
    dateSpy.mockRestore()
    mockT.mockClear()
  })

  it('returns empty string for invalid dates', () => {
    expect(formatConversationDate(null, mockT, 'en-US')).toBe('')
    expect(formatConversationDate('not date', mockT, 'en-US')).toBe('')
  })

  it('formats today as "Today, HH:mm"', () => {
    const today = new Date('2023-11-20T08:30:00Z').toISOString()
    const result = formatConversationDate(today, mockT, 'en-US')

    expect(result).toMatch(/assistant\.time\.today/)
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })

  it('formats yesterday as "Yesterday, HH:mm"', () => {
    const yesterday = new Date('2023-11-19T14:45:00Z').toISOString()
    const result = formatConversationDate(yesterday, mockT, 'en-US')

    expect(result).toMatch(/assistant\.time\.yesterday/)
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })

  it('formats older dates as formatted short date strings', () => {
    const older = new Date('2022-01-05T10:00:00Z').toISOString()
    const result = formatConversationDate(older, mockT, 'en-US')

    expect(result).toContain('2022')
    expect(result).toContain('Jan')
  })
})

describe('getNameOfConversation', () => {
  it('returns undefined if messages array is empty or missing', () => {
    expect(getNameOfConversation({}, t)).toBeUndefined()
    expect(getNameOfConversation({ messages: [] }, t)).toBeUndefined()
    expect(
      getNameOfConversation({ messages: [{ content: 'Hi' }] }, t)
    ).toBeUndefined()
  })

  it('returns the first question of the user', () => {
    const convo = {
      messages: [
        { role: 'user', content: 'What is the sum?' },
        { role: 'assistant', content: 'It is 4' }
      ]
    }
    expect(getNameOfConversation(convo, t)).toBe('What is the sum?')
  })

  it('returns the first question even when it has no answer', () => {
    expect(
      getNameOfConversation(
        {
          messages: [{ role: 'user', content: 'What failed?' }]
        },
        t
      )
    ).toBe('What failed?')
  })

  it('keeps the first question when the user asks another', () => {
    expect(
      getNameOfConversation(
        {
          messages: [
            { role: 'user', content: 'What is the sum?' },
            { role: 'assistant', content: 'It is 4 [Sources: 1]' },
            { role: 'user', content: 'And the product?' }
          ]
        },
        t
      )
    ).toBe('What is the sum?')
  })

  it('keeps the name the user gave', () => {
    expect(
      getNameOfConversation(
        {
          name: 'Plan',
          messages: [{ role: 'user', content: 'What is the sum?' }]
        },
        t
      )
    ).toBe('Plan')
  })
})

describe('getNameOfConversation of a conversation of the scribe', () => {
  it('shows the request of a chip, not its prompt', () => {
    const { q } = makeScribePreparePrompt('Bonjour')('correct-grammar')

    expect(
      getNameOfConversation({ messages: [{ role: 'user', content: q }] }, t)
    ).toBe('Correct the grammar and spelling of the text.')
  })

  it('shows a request without the text of the app', () => {
    const content = 'Add a slide\n\nText:\n"""\nBonjour\n"""'

    expect(
      getNameOfConversation({ messages: [{ role: 'user', content }] }, t)
    ).toBe('Add a slide')
  })
})

describe('getDescriptionOfConversation', () => {
  it('returns undefined if messages array is empty or missing', () => {
    expect(getDescriptionOfConversation({})).toBeUndefined()
    expect(getDescriptionOfConversation({ messages: [] })).toBeUndefined()
  })

  it('returns the last answer', () => {
    const convo = {
      messages: [
        { role: 'user', content: 'What is the sum?' },
        { role: 'assistant', content: 'It is 4' }
      ]
    }
    expect(getDescriptionOfConversation(convo)).toBe('It is 4')
  })

  it('returns the last answer when the last question has none', () => {
    const convo = {
      messages: [
        { role: 'user', content: 'What is the sum?' },
        { role: 'assistant', content: 'It is 4' },
        { role: 'user', content: 'And the product?' }
      ]
    }
    expect(getDescriptionOfConversation(convo)).toBe('It is 4')
  })

  it('strips inline citation markers from the description', () => {
    const convo = {
      messages: [
        { role: 'user', content: 'sum?' },
        { role: 'assistant', content: 'It is 4 [Sources: 1, 2]' }
      ]
    }
    expect(getDescriptionOfConversation(convo)).toBe('It is 4')
  })

  it('describes an answer in Markdown by its words', () => {
    const convo = {
      messages: [
        { role: 'user', content: 'sum?' },
        {
          role: 'assistant',
          content: '**It is 4**, see [the sums](https://x.org/sums_(table))'
        }
      ]
    }
    expect(getDescriptionOfConversation(convo)).toBe('It is 4, see the sums')
  })

  it('returns the translated fallback when the last assistant message has no content', () => {
    const t = key => key
    const convo = {
      messages: [
        { role: 'user', content: 'sum?' },
        { role: 'assistant', content: '' }
      ]
    }
    expect(getDescriptionOfConversation(convo, t)).toBe(
      'chat.errors.empty_response'
    )
  })

  it('does not apply the fallback to an answer of Markdown only', () => {
    const t = key => key
    const answer = content => ({
      messages: [
        { role: 'user', content: 'A chart?' },
        { role: 'assistant', content }
      ]
    })
    expect(getDescriptionOfConversation(answer('![](chart.png)'), t)).toBe('')
    expect(getDescriptionOfConversation(answer('---'), t)).toBe('')
  })

  it('has no description, not the fallback, before the first answer', () => {
    const t = key => key
    const convo = {
      messages: [{ role: 'user', content: '[Source 1]' }]
    }
    expect(getDescriptionOfConversation(convo, t)).toBeUndefined()
  })
})
