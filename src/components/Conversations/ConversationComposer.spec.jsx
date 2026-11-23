import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import flag from 'cozy-flags'

import ConversationComposer from './ConversationComposer'

const mockSetWebsearchEnabled = jest.fn()
let mockThread

jest.mock('@assistant-ui/react', () => ({
  useThread: selector => selector(mockThread),
  useComposer: selector => selector({ isEmpty: true })
}))
jest.mock('cozy-flags', () => jest.fn())
jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const useBreakpoints = () => ({ isMobile: false })
  return { __esModule: true, default: useBreakpoints, useBreakpoints }
})
jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: key => key })
}))
jest.mock('../AssistantProvider', () => ({
  useAssistant: () => ({
    websearchEnabled: false,
    setWebsearchEnabled: mockSetWebsearchEnabled
  })
}))
jest.mock('../KnowledgeBase/useSelectedAssistantKnowledgeBase', () => ({
  useSelectedAssistantKnowledgeBase: () => ({
    dirId: null,
    isRealAssistant: true,
    hasEmail: false
  })
}))
jest.mock('../TwakeKnowledges/TwakeKnowledgeSelector', () => () => (
  <div data-testid="sources" />
))
jest.mock('./ConversationBar', () => () => <div data-testid="bar" />)
jest.mock('./ConversationComposerRoot', () => ({
  ConversationComposerRoot: ({ children }) => <div>{children}</div>
}))
jest.mock('./ConversationSendButton', () => ({
  ConversationSendButton: () => <button type="button">send</button>
}))

const WEB_SEARCH = 'assistant.websearch.label'

const setup = ({ isRunning = false } = {}) => {
  mockThread = { isRunning, messages: [{ id: 'm1' }] }
  flag.mockImplementation(name => name === 'cozy.assistant.websearch.enabled')
  render(<ConversationComposer placeholder="" />)
}

describe('ConversationComposer', () => {
  beforeEach(() => {
    mockSetWebsearchEnabled.mockReset()
  })

  it('shows the web search toggle next to Send in a started thread', () => {
    setup()

    const toggle = screen.getByRole('button', { name: WEB_SEARCH })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle.nextSibling).toBe(
      screen.getByRole('button', { name: 'send' })
    )
    expect(screen.queryByTestId('sources')).toBe(null)

    fireEvent.click(toggle)
    expect(mockSetWebsearchEnabled).toHaveBeenCalled()
  })

  it('disables the web search toggle while an answer runs', () => {
    setup({ isRunning: true })

    expect(screen.getByRole('button', { name: WEB_SEARCH })).toBeDisabled()
  })
})
