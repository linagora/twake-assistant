import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { ScribeComposer } from '@/components/Scribe/ScribeComposer'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import en from '@/locales/en.json'

const mockComposer = {
  text: '',
  getState: () => ({ text: mockComposer.text }),
  send: jest.fn(),
  cancel: jest.fn()
}
let mockThread = { isRunning: false }

jest.mock('@assistant-ui/react', () => ({
  ComposerPrimitive: {
    Root: ({ children, className }) => (
      <form className={className}>{children}</form>
    ),
    Input: props => <textarea {...props} />
  },
  useComposerRuntime: () => mockComposer,
  useThread: selector => selector(mockThread)
}))
jest.mock('@/components/Scribe/ScribeProvider', () => ({
  useScribe: jest.fn()
}))

function renderComposer({
  isRunning = false,
  layout = 'panel',
  text = ''
} = {}) {
  mockThread = { isRunning }
  mockComposer.text = text
  const setHasDocuments = jest.fn()
  const onCancel = jest.fn()
  useScribe.mockReturnValue({
    hasDocuments: false,
    setHasDocuments,
    layout,
    onCancel
  })

  render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <div data-scribe-thread>
        <div data-scribe-card>
          <button>Copy</button>
          <button>Insert</button>
        </div>
        <ScribeComposer placeholder={en.scribe.placeholder} />
      </div>
    </I18n>
  )

  return { setHasDocuments, onCancel }
}

describe('ScribeComposer', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends what the user wrote', () => {
    renderComposer()

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(mockComposer.send).toHaveBeenCalledTimes(1)
  })

  it('stops the answer being written', () => {
    renderComposer({ isRunning: true })

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(mockComposer.cancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Send' })).toBe(null)
  })

  it('lets the user ask for their documents, between two answers', () => {
    const { setHasDocuments } = renderComposer()
    const toggle = screen.getByRole('button', { name: 'Use Drive files' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(toggle)

    expect(setHasDocuments).toHaveBeenCalledTimes(1)
    expect(setHasDocuments.mock.calls[0][0](false)).toBe(true)
  })

  it('cancels on Escape in the compact layout', () => {
    const { onCancel } = renderComposer({ layout: 'compact' })
    const input = screen.getByRole('textbox', { name: 'Help me write' })

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCancel).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps the compact layout open on Escape while composing', () => {
    const { onCancel } = renderComposer({ layout: 'compact' })

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Help me write' }), {
      key: 'Escape',
      isComposing: true
    })

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('keeps the panel open on Escape', () => {
    const { onCancel } = renderComposer()

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Help me write' }), {
      key: 'Escape'
    })

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('focuses the latest card on arrow up with an empty draft', () => {
    renderComposer()
    const input = screen.getByRole('textbox', { name: 'Help me write' })
    input.focus()

    expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(false)

    expect(screen.getByRole('button', { name: 'Insert' })).toHaveFocus()
  })

  it('keeps the focus on arrow up with a draft, or while composing', () => {
    renderComposer({ text: 'Hi' })
    const input = screen.getByRole('textbox', { name: 'Help me write' })
    input.focus()

    expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(true)
    expect(input).toHaveFocus()
    mockComposer.text = ''
    fireEvent.keyDown(input, { key: 'ArrowUp', isComposing: true })

    expect(input).toHaveFocus()
  })

  it('does not change the sources while an answer is written', () => {
    renderComposer({ isRunning: true })

    expect(
      screen.getByRole('button', { name: 'Use Drive files' })
    ).toBeDisabled()
  })
})
