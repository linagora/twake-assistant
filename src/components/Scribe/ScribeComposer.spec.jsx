import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { ScribeComposer } from '@/components/Scribe/ScribeComposer'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import en from '@/locales/en.json'

const mockComposer = { send: jest.fn(), cancel: jest.fn() }
let mockThread = { isRunning: false }
let mockComposerState = { isEmpty: true }

jest.mock('@assistant-ui/react', () => ({
  ComposerPrimitive: {
    Root: ({ children, className }) => (
      <form className={className}>{children}</form>
    ),
    Input: props => <textarea {...props} />
  },
  useComposerRuntime: () => mockComposer,
  useThread: selector => selector(mockThread),
  useComposer: selector => selector(mockComposerState)
}))
jest.mock('@/components/Scribe/ScribeProvider', () => ({
  useScribe: jest.fn()
}))

function renderComposer({ isRunning = false, isEmpty = true } = {}) {
  mockThread = { isRunning }
  mockComposerState = { isEmpty }
  const setHasDocuments = jest.fn()
  useScribe.mockReturnValue({ hasDocuments: false, setHasDocuments })

  render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <ScribeComposer />
    </I18n>
  )

  return { setHasDocuments }
}

describe('ScribeComposer', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends what the user wrote', () => {
    renderComposer({ isEmpty: false })

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(mockComposer.send).toHaveBeenCalledTimes(1)
  })

  it('sends nothing when nothing is written', () => {
    renderComposer({ isEmpty: true })

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('stops the answer being written', () => {
    renderComposer({ isRunning: true })

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(mockComposer.cancel).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Send' })).toBe(null)
  })

  it('lets the user ask for their documents, between two answers', () => {
    const { setHasDocuments } = renderComposer()
    const toggle = screen.getByRole('button', { name: 'Use my documents' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(toggle)

    expect(setHasDocuments).toHaveBeenCalledTimes(1)
    expect(setHasDocuments.mock.calls[0][0](false)).toBe(true)
  })

  it('does not change the sources while an answer is written', () => {
    renderComposer({ isRunning: true })

    expect(
      screen.getByRole('button', { name: 'Use my documents' })
    ).toBeDisabled()
  })
})
