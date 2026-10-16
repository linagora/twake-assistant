import {
  formatConversationDate,
  getNameOfConversation,
  getDescriptionOfConversation
} from './helpers'

jest.mock('cozy-flags', () => jest.fn(() => true), { virtual: true })

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
    expect(getNameOfConversation({})).toBeUndefined()
    expect(getNameOfConversation({ messages: [] })).toBeUndefined()
    expect(
      getNameOfConversation({ messages: [{ content: 'Hi' }] })
    ).toBeUndefined()
  })

  it('returns the content of the second to last message', () => {
    const convo = {
      messages: [
        { role: 'user', content: 'What is the sum?' },
        { role: 'assistant', content: 'It is 4' }
      ]
    }
    expect(getNameOfConversation(convo)).toBe('What is the sum?')
  })
})

describe('getDescriptionOfConversation', () => {
  it('returns undefined if messages array is empty or missing', () => {
    expect(getDescriptionOfConversation({})).toBeUndefined()
    expect(getDescriptionOfConversation({ messages: [] })).toBeUndefined()
  })

  it('returns the content of the last message', () => {
    const convo = {
      messages: [
        { role: 'user', content: 'What is the sum?' },
        { role: 'assistant', content: 'It is 4' }
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
    expect(getDescriptionOfConversation(convo, t)).toBe('chat.empty')
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

  it('does not apply the fallback when the last message is from the user', () => {
    const t = key => key
    const convo = {
      messages: [{ role: 'user', content: '[Source 1]' }]
    }
    expect(getDescriptionOfConversation(convo, t)).toBe('')
  })
})
