import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { useQuery } from 'cozy-client'
import CozyTheme from 'cozy-ui/transpiled/react/providers/CozyTheme'

import { useIsConversationAssistantGone } from '../KnowledgeBase/useIsConversationAssistantGone'
import Conversation from './Conversation'

const mockCreateNewConversation = jest.fn()

let mockMessages = []

jest.mock('cozy-client', () => ({
  ...jest.requireActual('cozy-client'),
  useQuery: jest.fn()
}))
jest.mock('@assistant-ui/react', () => ({
  useThread: selector => selector({ messages: mockMessages }),
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

const setup = (isAssistantGone, { conversation = null } = {}) => {
  useIsConversationAssistantGone.mockReturnValue(isAssistantGone)
  useQuery.mockReturnValue({ data: conversation })
  render(
    <CozyTheme>
      <Conversation />
    </CozyTheme>
  )
}

describe('Conversation', () => {
  beforeEach(() => {
    mockCreateNewConversation.mockReset()
    mockMessages = [{ id: 'm1' }]
    document.title = 'Twake Assistant'
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

  it('titles the page of a new conversation', () => {
    mockMessages = []
    setup(false)

    expect(document.title).toBe(
      'assistant.search_conversation.new_chat – Twake Assistant'
    )
  })

  it('titles the page after the first question until the conversation is named', () => {
    mockMessages = [
      { id: 'm1', role: 'user', content: [{ type: 'text', text: 'Budget?' }] }
    ]
    setup(false)
    expect(document.title).toBe('Budget? – Twake Assistant')
  })

  it('titles the page after the name of the conversation', () => {
    mockMessages = [
      { id: 'm1', role: 'user', content: [{ type: 'text', text: 'Budget?' }] }
    ]
    setup(false, { conversation: { _id: 'c1', name: 'Budget talk' } })
    expect(document.title).toBe('Budget talk – Twake Assistant')
  })
})
