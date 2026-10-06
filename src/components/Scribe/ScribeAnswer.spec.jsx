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
jest.mock('@/components/Scribe/ScribeCapabilityCard', () => ({
  ScribeCapabilityCard: ({ messageId, capability, params, text }) => (
    <div data-testid="capability">
      {messageId} {capability.name} {params.title} {text}
    </div>
  )
}))
jest.mock('@/components/Scribe/ScribeSources', () => ({
  ScribeSources: ({ sources }) => (
    <div data-testid="sources">{sources.length}</div>
  )
}))

const answer = (text, status, custom = {}) => ({
  id: 'a1',
  content: [{ type: 'text', text }],
  status: { type: status },
  metadata: { custom }
})

function renderAnswer(message, answerActions = [], capabilities = []) {
  mockMessage = message
  useScribe.mockReturnValue({ answerActions, capabilities })

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

  describe('the call of a capability the LLM proposes', () => {
    const insertSlide = { name: 'insert_slide', label: 'Insert' }
    const action = { name: 'insert_slide', params: { title: 'Risks' } }

    it('shows it in place of an answer, without the actions of the answer', () => {
      renderAnswer(answer('', 'complete', { action }), actions, [insertSlide])

      expect(screen.getByTestId('capability').textContent).toBe(
        'a1 insert_slide Risks '
      )
      expect(screen.queryByText(en.scribe.empty)).toBe(null)
      expect(screen.queryByRole('button')).toBe(null)
    })

    it('shows it under an answer, with the answer for its content', () => {
      renderAnswer(answer('Here', 'complete', { action }), actions, [
        insertSlide
      ])

      expect(screen.getByTestId('capability').textContent).toBe(
        'a1 insert_slide Risks Here'
      )
      expect(
        screen.queryByRole('button', { name: 'Insert' })
      ).toBeInTheDocument()
    })

    it('waits for the answer to be complete', () => {
      renderAnswer(answer('Here', 'running', { action }), actions, [
        insertSlide
      ])

      expect(screen.queryByTestId('capability')).toBe(null)
    })

    it('leaves out a call of a capability the app does not have', () => {
      renderAnswer(answer('', 'complete', { action }), [], [])

      expect(screen.queryByTestId('capability')).toBe(null)
    })
  })
})
