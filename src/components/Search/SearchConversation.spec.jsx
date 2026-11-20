import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import en from '../../locales/en.json'
import SearchConversation from './SearchConversation'

const mockUseFetchConversations = jest.fn()

jest.mock('../../hooks/useFetchConversations', () => ({
  __esModule: true,
  default: props => mockUseFetchConversations(props)
}))
jest.mock('../../hooks/useConversation', () => ({
  __esModule: true,
  default: () => ({
    createNewConversation: jest.fn(),
    goToConversation: jest.fn()
  })
}))
jest.mock('../AssistantProvider', () => ({
  useAssistant: () => ({ setIsOpenSearchConversation: jest.fn() })
}))
jest.mock('../Conversations/ConversationList', () => ({
  __esModule: true,
  default: ({ conversations }) =>
    conversations.map(conversation => (
      <div key={conversation._id}>{conversation.name}</div>
    ))
}))
jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const useBreakpoints = () => ({ isMobile: false })
  return { __esModule: true, default: useBreakpoints, useBreakpoints }
})

const setup = () =>
  render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <SearchConversation />
    </I18n>
  )

const search = value => {
  fireEvent.change(screen.getByRole('textbox'), { target: { value } })
  act(() => {
    jest.advanceTimersByTime(300)
  })
}

const lastQuery = () => mockUseFetchConversations.mock.lastCall[0].query

describe('SearchConversation', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockUseFetchConversations.mockReset()
    mockUseFetchConversations.mockReturnValue({
      conversations: [],
      isLoading: false
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('searches names and messages whatever the case, literally', () => {
    setup()

    search('Budget (2026)*')

    const re = lastQuery().$or[0].name
    expect(lastQuery()).toEqual({
      $or: [{ name: re }, { messages: { $elemMatch: { content: re } } }]
    })
    const pattern = new RegExp(re.$regex)
    expect(pattern.test('The BUDGET (2026)* plan')).toBe(true)
    expect(pattern.test('the budget (2026)* plan')).toBe(true)
    expect(pattern.test('Budget 2026')).toBe(false)

    search('бюджет')

    expect(
      new RegExp(lastQuery().$or[0].name.$regex).test('Бюджет на 2026 год')
    ).toBe(true)

    search('')

    expect(lastQuery()).toBeUndefined()
  })
})
