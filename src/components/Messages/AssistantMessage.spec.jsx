import { render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

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
  it('offers to copy an answer', () => {
    renderMessage(answer('Bonjour', { type: 'complete', reason: 'stop' }))

    expect(screen.queryByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('offers no copy of an answer stopped before its first word', () => {
    renderMessage(answer('', { type: 'incomplete', reason: 'cancelled' }))

    expect(screen.queryByRole('button', { name: 'Copy' })).toBe(null)
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
