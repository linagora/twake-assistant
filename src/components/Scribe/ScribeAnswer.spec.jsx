import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { ScribeAnswer } from '@/components/Scribe/ScribeAnswer'
import { useScribe } from '@/components/Scribe/ScribeProvider'
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
jest.mock('@/components/Scribe/ScribeProvider', () => ({
  useScribe: jest.fn()
}))
jest.mock('@/components/Scribe/ScribeSources', () => ({
  ScribeSources: ({ sources }) => (
    <div data-testid="sources">{sources.length}</div>
  )
}))

const answer = (text, status, custom = {}) => ({
  content: [{ type: 'text', text }],
  status: { type: status },
  metadata: { custom }
})

function renderAnswer(message, answerActions = []) {
  mockMessage = message
  useScribe.mockReturnValue({ answerActions })

  return render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <ScribeAnswer />
    </I18n>
  )
}

describe('ScribeAnswer', () => {
  const actions = [
    { name: 'insert', label: 'Insert', onClick: jest.fn() },
    { name: 'replace', label: 'Replace', onClick: jest.fn() }
  ]

  it('waits for the answer', () => {
    renderAnswer(answer('', 'running'), actions)

    expect(screen.queryByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBe(null)
  })

  it('shows the answer as it comes, without the actions yet', () => {
    renderAnswer(answer('Bonjour', 'running'), actions)

    expect(screen.queryByText('Bonjour')).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBe(null)
    expect(screen.queryByRole('button')).toBe(null)
  })

  it('hands a whole answer to the action the user clicks', () => {
    renderAnswer(answer('Bonjour à **tous**', 'complete'), actions)

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

    expect(actions[1].onClick).toHaveBeenCalledWith('Bonjour à **tous**')
    expect(actions[0].onClick).not.toHaveBeenCalled()
  })

  it('renders the answer as Markdown', () => {
    renderAnswer(answer('Bonjour à **tous**', 'complete'))

    expect(screen.queryByText('tous').tagName).toBe('STRONG')
  })

  it('tells when the answer failed, with what came', () => {
    renderAnswer(answer('Bonj', 'incomplete', { isError: true }), actions)

    expect(screen.queryByRole('alert')).toHaveTextContent('An error occurred')
    expect(screen.queryByText('Bonj')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBe(null)
  })

  it('tells when the answer is empty', () => {
    renderAnswer(answer('', 'complete', { isEmpty: true }), actions)

    expect(screen.queryByText(/could not find an answer/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBe(null)
  })

  it('shows the sources of an answer from the documents', () => {
    renderAnswer(
      answer('The budget', 'complete', {
        sources: [{ id: 'f1' }, { id: 'f2' }]
      })
    )

    expect(screen.queryByTestId('sources')).toHaveTextContent('2')
  })
})
