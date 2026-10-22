import { act, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'

import Minilog from 'cozy-minilog'
import { I18n, initTranslation } from 'twake-i18n'

import { ScribeAnswer } from '@/components/Scribe/ScribeAnswer'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import { copyAnswer } from '@/lib/clipboard'
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
  useThread: selector => selector(mockThread),
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
jest.mock('@/components/Messages/Sources', () => ({
  Sources: ({ sources }) => <div data-testid="sources">{sources.length}</div>
}))
jest.mock('@/lib/clipboard', () => ({
  copyAnswer: jest.fn()
}))
jest.mock('cozy-minilog', () => {
  const log = { error: jest.fn() }
  return () => log
})

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
    copyAnswer.mockReset()
    copyAnswer.mockResolvedValue(true)
    Minilog().error.mockClear()
    actions.forEach(action => action.onClick.mockClear())
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

  it('offers to copy a whole answer, before the actions of the app', () => {
    renderAnswer(answer('Bonjour', 'complete'), actions)

    expect(
      screen
        .getAllByRole('button')
        .map(button => button.getAttribute('aria-label') ?? button.textContent)
    ).toEqual(['Copy', 'Insert', 'Replace'])
  })

  it('offers to copy even when the app has no action', () => {
    renderAnswer(answer('Bonjour', 'complete'), [])

    expect(screen.queryByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('copies the answer', async () => {
    renderAnswer(answer('Bonjour à **tous**', 'complete'), actions)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    })

    expect(copyAnswer).toHaveBeenCalledWith('Bonjour à **tous**')
    expect(actions[0].onClick).not.toHaveBeenCalled()
    expect(actions[1].onClick).not.toHaveBeenCalled()
  })

  describe('the feedback of a click', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('shows a check for 1.5 s after an action', () => {
      renderAnswer(answer('Bonjour', 'complete'), actions)
      const insert = screen.getByRole('button', { name: 'Insert' })
      expect(within(insert).queryByTestId('scribe-check')).toBe(null)

      fireEvent.click(insert)

      expect(within(insert).queryByTestId('scribe-check')).toBeInTheDocument()
      expect(insert).toHaveAccessibleName('Insert')
      expect(
        within(screen.getByRole('button', { name: 'Replace' })).queryByTestId(
          'scribe-check'
        )
      ).toBe(null)

      act(() => jest.advanceTimersByTime(1499))
      expect(within(insert).queryByTestId('scribe-check')).toBeInTheDocument()

      act(() => jest.advanceTimersByTime(1))
      expect(within(insert).queryByTestId('scribe-check')).toBe(null)
    })

    it('starts the 1.5 s again on a second click', () => {
      renderAnswer(answer('Bonjour', 'complete'), actions)
      const insert = screen.getByRole('button', { name: 'Insert' })

      fireEvent.click(insert)
      act(() => jest.advanceTimersByTime(1000))
      fireEvent.click(insert)
      act(() => jest.advanceTimersByTime(1000))

      expect(within(insert).queryByTestId('scribe-check')).toBeInTheDocument()

      act(() => jest.advanceTimersByTime(500))
      expect(within(insert).queryByTestId('scribe-check')).toBe(null)
    })

    it('shows a check for 1.5 s once the answer is copied', async () => {
      renderAnswer(answer('Bonjour', 'complete'), actions)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      })

      const copied = screen.getByRole('button', { name: 'Copied' })
      expect(within(copied).queryByTestId('scribe-check')).toBeInTheDocument()

      act(() => jest.advanceTimersByTime(1500))
      expect(screen.queryByRole('button', { name: 'Copied' })).toBe(null)
      expect(screen.queryByRole('button', { name: 'Copy' })).toBeInTheDocument()
    })

    it('shows no check, and logs it, when the copy fails', async () => {
      const error = new Error('NotAllowedError')
      copyAnswer.mockRejectedValue(error)
      renderAnswer(answer('Bonjour', 'complete'), actions)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      })

      expect(screen.queryByRole('button', { name: 'Copy' })).toBeInTheDocument()
      expect(screen.queryByTestId('scribe-check')).toBe(null)
      expect(Minilog().error).toHaveBeenCalledWith(
        'The answer could not be copied',
        error
      )
    })

    it('shows no check when there was nothing to copy to', async () => {
      copyAnswer.mockResolvedValue(false)
      renderAnswer(answer('Bonjour', 'complete'), actions)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
      })

      expect(screen.queryByRole('button', { name: 'Copy' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Copied' })).toBe(null)
      expect(screen.queryByTestId('scribe-check')).toBe(null)
      expect(Minilog().error).not.toHaveBeenCalled()
    })
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

  it('does not offer to try again when the agent of the conversation is gone', () => {
    renderAnswer(
      answer('', 'incomplete', { isError: true, isAssistantGone: true }),
      actions
    )

    expect(screen.queryByRole('button', { name: 'Try again' })).toBe(null)
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

  describe('the call of a capability the LLM proposes', () => {
    const insertSlide = { name: 'insert_slide', label: 'Insert' }
    const action = { name: 'insert_slide', params: { title: 'Risks' } }

    it('shows it in place of an answer, without the actions of the answer', () => {
      renderAnswer(answer('', 'complete', { action }), actions, [insertSlide])

      expect(screen.getByTestId('capability').textContent).toBe(
        'a1 insert_slide Risks '
      )
      expect(screen.queryByText(en.chat.empty)).toBe(null)
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
      expect(screen.queryByText(en.chat.empty)).toBeInTheDocument()
      expect(screen.queryByRole('button')).toBe(null)
    })
  })
})
