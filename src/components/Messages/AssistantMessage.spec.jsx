import { render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { useIsConversationAssistantGone } from '@/components/KnowledgeBase/useIsConversationAssistantGone'
import AssistantMessage from '@/components/Messages/AssistantMessage'
import en from '@/locales/en.json'

let mockMessage = null

jest.mock('@assistant-ui/react', () => ({
  MessagePrimitive: {
    Root: ({ children, className }) => (
      <div className={className}>{children}</div>
    )
  },
  ActionBarPrimitive: {
    Root: ({ children }) => <div>{children}</div>,
    Copy: ({ children }) => children,
    Reload: ({ children }) => children
  },
  useMessage: selector => selector(mockMessage),
  useAuiState: selector => selector({ message: mockMessage })
}))

jest.mock('react-router-dom', () => ({
  useParams: () => ({ conversationId: 'c1' })
}))
jest.mock('@/components/KnowledgeBase/useIsConversationAssistantGone', () => ({
  useIsConversationAssistantGone: jest.fn()
}))

const answer = (text, status) => ({
  id: 'a1',
  isLast: true,
  content: [{ type: 'text', text }],
  status,
  metadata: { custom: {} }
})

function renderMessage(message) {
  mockMessage = message

  return render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <AssistantMessage />
    </I18n>
  )
}

describe('AssistantMessage', () => {
  beforeEach(() => {
    useIsConversationAssistantGone.mockReturnValue(false)
  })

  it('offers to copy an answer', () => {
    renderMessage(answer('Bonjour', { type: 'complete', reason: 'stop' }))

    expect(screen.queryByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('offers no copy of an answer stopped before its first word', () => {
    renderMessage(answer('', { type: 'incomplete', reason: 'cancelled' }))

    expect(screen.queryByRole('button', { name: 'Copy' })).toBe(null)
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('offers to retry the last answer', () => {
    renderMessage(answer('Bonjour', { type: 'complete', reason: 'stop' }))

    expect(useIsConversationAssistantGone).toHaveBeenCalledWith('c1')
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('offers no retry in a conversation whose agent was deleted', () => {
    useIsConversationAssistantGone.mockReturnValue(true)
    renderMessage(answer('Bonjour', { type: 'complete', reason: 'stop' }))

    expect(screen.queryByRole('button', { name: 'Retry' })).toBe(null)
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('tells a question was left without an answer, and offers to ask it again', () => {
    renderMessage({
      ...answer('', { type: 'complete', reason: 'unknown' }),
      metadata: { custom: { isInterrupted: true } }
    })

    expect(screen.queryByText(en.chat.interrupted)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Ask again' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBe(null)
    expect(screen.queryByRole('button', { name: 'Copy' })).toBe(null)
  })

  it('offers no retry while the agent of the conversation loads', () => {
    useIsConversationAssistantGone.mockReturnValue(null)
    renderMessage(answer('Bonjour', { type: 'complete', reason: 'stop' }))

    expect(screen.queryByRole('button', { name: 'Retry' })).toBe(null)
  })
})
