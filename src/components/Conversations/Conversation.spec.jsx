import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import CozyTheme from 'cozy-ui/transpiled/react/providers/CozyTheme'

import Conversation from './Conversation'
import { useIsConversationAssistantGone } from '../KnowledgeBase/useIsConversationAssistantGone'

const mockCreateNewConversation = jest.fn()

jest.mock('@assistant-ui/react', () => ({
  useThread: selector => selector({ messages: [{ id: 'm1' }] }),
  ThreadPrimitive: {
    Root: ({ children }) => <div>{children}</div>,
    Empty: () => null,
    Viewport: ({ children }) => <div>{children}</div>,
    Messages: () => null
  }
}))
jest.mock('react-router-dom', () => ({
  useParams: () => ({ conversationId: 'c1' })
}))
jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: key => key })
}))
jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const useBreakpoints = () => ({ isMobile: false })
  return { __esModule: true, default: useBreakpoints, useBreakpoints }
})
jest.mock('../../hooks/useConversation', () => () => ({
  createNewConversation: mockCreateNewConversation
}))
jest.mock('../AssistantProvider', () => ({
  useAssistant: () => ({ isOpenSources: false, setIsOpenSources: jest.fn() })
}))
jest.mock('../KnowledgeBase/useSelectedAssistantKnowledgeBase', () => ({
  useSelectedAssistantKnowledgeBase: () => ({ hasFolder: false })
}))
jest.mock('../KnowledgeBase/useIsConversationAssistantGone', () => ({
  useIsConversationAssistantGone: jest.fn()
}))
jest.mock('./ConversationComposer', () => () => <div data-testid="composer" />)
jest.mock('./ConversationWelcome', () => ({ ConversationWelcome: () => null }))

const setup = isAssistantGone => {
  useIsConversationAssistantGone.mockReturnValue(isAssistantGone)
  render(
    <CozyTheme>
      <Conversation />
    </CozyTheme>
  )
}

describe('Conversation', () => {
  beforeEach(() => {
    mockCreateNewConversation.mockReset()
  })

  it('offers a new chat in place of the composer when its agent is gone', () => {
    setup(true)

    expect(useIsConversationAssistantGone).toHaveBeenCalledWith('c1')
    expect(screen.queryByTestId('composer')).toBe(null)
    expect(screen.queryByText('chat.assistant_gone')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'assistant.sidebar.create_new' })
    )
    expect(mockCreateNewConversation).toHaveBeenCalled()
  })

  it('keeps the composer while its agent exists', () => {
    setup(false)

    expect(screen.queryByTestId('composer')).toBeInTheDocument()
    expect(screen.queryByText('chat.assistant_gone')).toBe(null)
  })
})
