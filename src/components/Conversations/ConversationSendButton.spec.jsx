import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { ConversationSendButton } from '@/components/Conversations/ConversationSendButton'
import en from '@/locales/en.json'

const mockSend = jest.fn()
const mockCancel = jest.fn()
let mockText = ''
let mockIsRunning = false

// assistant-ui is ESM only, so jest cannot load it: this mock keeps its
// composer state, empty when the text holds only spaces
jest.mock('@assistant-ui/react', () => ({
  useComposerRuntime: () => ({ send: mockSend, cancel: mockCancel }),
  useComposer: selector =>
    selector({ text: mockText, isEmpty: !mockText.trim() }),
  useThread: selector => selector({ isRunning: mockIsRunning })
}))

function setup({ text = '', isRunning = false } = {}) {
  mockText = text
  mockIsRunning = isRunning
  const makeButton = () => (
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <ConversationSendButton />
    </I18n>
  )
  const { rerender } = render(makeButton())
  return {
    setText: nextText => {
      mockText = nextText
      rerender(makeButton())
    }
  }
}

describe('ConversationSendButton', () => {
  beforeEach(() => {
    mockSend.mockClear()
    mockCancel.mockClear()
  })

  it('cannot send an empty question', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('cannot send a question of spaces only', () => {
    setup({ text: '   ' })

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('sends once a question is typed', () => {
    const { setText } = setup()

    setText('hello')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('stops the answer being written, with an empty composer', () => {
    setup({ isRunning: true })

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled()
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })
})
