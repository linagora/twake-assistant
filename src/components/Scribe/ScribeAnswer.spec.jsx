import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { ScribeAnswer } from '@/components/Scribe/ScribeAnswer'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import en from '@/locales/en.json'

let mockMessage = null
let mockThread = { messages: [] }
const mockReload = jest.fn()

jest.mock('@assistant-ui/react', () => ({
  MessagePrimitive: {
    Root: ({ children, className }) => (
      <div className={className}>{children}</div>
    )
  },
  useMessage: selector => selector(mockMessage),
  useMessageRuntime: () => ({
    reload: mockReload,
    getState: () => mockMessage
  }),
  useThreadRuntime: () => ({ getState: () => mockThread })
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
  isLast: true,
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
  beforeEach(() => {
    mockThread = { messages: [] }
    mockReload.mockClear()
  })

  const actions = [
    { name: 'insert', label: 'Insert', onClick: jest.fn() },
    { name: 'replace', label: 'Replace', onClick: jest.fn() }
  ]

  it('waits for the answer', () => {
    renderAnswer(answer('', 'running'), actions)

    expect(screen.queryByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBe(null)
  })

  it('tells that the model thinks, in place of the spinner', () => {
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

  it('tells when the answer failed, with what came, and lets the user try again', () => {
    renderAnswer(answer('Bonj', 'incomplete', { isError: true }), actions)

    expect(screen.queryByRole('alert')).toHaveTextContent('An error occurred')
    expect(screen.queryByText('Bonj')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Insert' })).toBe(null)
    expect(
      screen.queryByRole('button', { name: 'Try again' })
    ).toBeInTheDocument()
  })

  it('asks the answer again with the prompt of the request', () => {
    mockThread = {
      messages: [
        { id: 'q1', role: 'user', metadata: { custom: { prompt: 'fix' } } }
      ]
    }
    renderAnswer(
      { ...answer('', 'incomplete', { isError: true }), parentId: 'q1' },
      actions
    )

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(mockReload).toHaveBeenCalledWith({
      runConfig: { custom: { prompt: 'fix' } }
    })
  })

  it('tells when the answer is empty, and lets the user try again', () => {
    renderAnswer(answer('', 'complete', { isEmpty: true }), actions)

    expect(screen.queryByText(/could not find an answer/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Insert' })).toBe(null)
    expect(
      screen.queryByRole('button', { name: 'Try again' })
    ).toBeInTheDocument()
  })

  it('lets the user try again only the last answer of the conversation', () => {
    renderAnswer(
      { ...answer('', 'complete', { isEmpty: true }), isLast: false },
      actions
    )
    expect(screen.queryByRole('button', { name: 'Try again' })).toBe(null)
  })

  it('does not ask again an answer of a past conversation', () => {
    renderAnswer(
      answer('', 'complete', { isEmpty: true, isPast: true }),
      actions
    )
    expect(screen.queryByText(/could not find an answer/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBe(null)
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
      expect(screen.queryByText(en.scribe.empty)).toBeInTheDocument()
      expect(screen.queryByRole('button')).toBe(null)
    })
  })
})
