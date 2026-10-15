import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { Answer } from '@/components/Messages/Answer'
import en from '@/locales/en.json'

let mockMessage = null

jest.mock('@assistant-ui/react', () => ({
  MessagePrimitive: {
    Root: ({ children, className }) => (
      <div className={className}>{children}</div>
    )
  },
  useMessage: selector => selector(mockMessage)
}))
jest.mock('@/components/Messages/Sources', () => ({
  Sources: ({ sources }) => <div data-testid="sources">{sources.length}</div>
}))

const answer = (text, status, custom = {}) => ({
  id: 'a1',
  content: [{ type: 'text', text }],
  status: { type: status },
  metadata: { custom }
})

function renderAnswer(message, props = {}) {
  mockMessage = message

  return render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <Answer {...props} />
    </I18n>
  )
}

describe('Answer', () => {
  it('waits for the answer', () => {
    renderAnswer(answer('', 'running'))

    expect(
      screen.queryByRole('status', { name: 'The assistant is writing…' })
    ).toBeInTheDocument()
  })

  it('tells that the model thinks, in place of the dots', () => {
    renderAnswer({
      ...answer('', 'running'),
      content: [
        { type: 'reasoning', text: '17 x 23' },
        { type: 'text', text: '' }
      ]
    })

    expect(
      screen.queryByRole('button', { name: 'Thinking…' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'The assistant is writing…' })
    ).toBe(null)
    expect(screen.queryByRole('status')).toHaveTextContent('Thinking…')
  })

  it('folds what the model thought in a line, opened by a click', () => {
    renderAnswer({
      ...answer('391', 'complete'),
      content: [
        { type: 'reasoning', text: '17 x 20 = 340\n17 x 3 = 51' },
        { type: 'text', text: '391' }
      ]
    })
    const line = screen.getByRole('button', { name: 'Thought process' })

    expect(line).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('17 x 3 = 51')).toBe(null)

    fireEvent.click(line)

    expect(line).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByText('17 x 3 = 51')).toBeInTheDocument()
  })

  it('shows the answer as it comes, as Markdown', () => {
    renderAnswer(answer('Bonjour à **tous**', 'running'))

    expect(screen.queryByText('tous').tagName).toBe('STRONG')
    expect(screen.queryByRole('status')).toBe(null)
  })

  it('tells when the answer failed, with what came', () => {
    renderAnswer(answer('Bonj', 'incomplete', { isError: true }))

    expect(screen.queryByRole('alert')).toHaveTextContent('An error occurred')
    expect(screen.queryByText('Bonj')).toBeInTheDocument()
  })

  it('tells when the assistant of the conversation was deleted', () => {
    renderAnswer(
      answer('', 'incomplete', { isError: true, isAssistantGone: true })
    )

    expect(screen.queryByRole('alert')).toHaveTextContent(
      'The agent of this conversation was deleted'
    )
  })

  it('tells when the answer is empty, and hides its sources', () => {
    renderAnswer(
      answer('', 'complete', {
        isEmpty: true,
        sources: [{ id: 'f1' }, { id: 'f2' }]
      })
    )

    expect(screen.queryByText(en.chat.empty)).toBeInTheDocument()
    expect(screen.queryByTestId('sources')).toBe(null)
  })

  it('tells that an answer with only a call is empty, unless the view shows the call', () => {
    const call = answer('', 'complete', { action: { name: 'insert_slide' } })

    renderAnswer(call)
    expect(screen.queryByText(en.chat.empty)).toBeInTheDocument()

    renderAnswer(call, { isCallShown: true })
    expect(screen.queryAllByText(en.chat.empty)).toHaveLength(1)
  })

  it('shows the sources of an answer', () => {
    renderAnswer(
      answer('The budget', 'complete', {
        sources: [{ id: 'f1' }, { id: 'f2' }]
      })
    )

    expect(screen.queryByTestId('sources')).toHaveTextContent('2')
  })

  it('shows the actions of the view under the answer', () => {
    renderAnswer(answer('Bonjour', 'complete'), {
      children: <button>Copy</button>
    })

    expect(screen.queryByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })
})
