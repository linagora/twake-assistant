import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { isMobile as isMobileDevice } from 'cozy-device-helper'
import { I18n, initTranslation } from 'twake-i18n'

import ConversationBar from '@/components/Conversations/ConversationBar'
import en from '@/locales/en.json'

const mockSend = jest.fn()
let mockIsMobile = false

// As assistant-ui does: Enter submits the closest form, and the form of the
// composer sends the question
jest.mock('@assistant-ui/react', () => {
  const React = require('react')
  return {
    ComposerPrimitive: {
      Root: ({ children }) => (
        <form
          onSubmit={event => {
            event.preventDefault()
            mockSend()
          }}
        >
          {children}
        </form>
      ),

      Input: React.forwardRef(
        ({ submitOnEnter, onHeightChange, ...props }, ref) => (
          <textarea
            ref={ref}
            {...props}
            onKeyDown={event => {
              if (event.key !== 'Enter' || event.shiftKey) return
              if (submitOnEnter === false) return
              event.preventDefault()
              event.target.closest('form')?.requestSubmit()
            }}
          />
        )
      )
    },
    useComposer: selector => selector({ text: '' })
  }
})
jest.mock('cozy-device-helper', () => ({ isMobile: jest.fn() }))
jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const useBreakpoints = () => ({ isMobile: mockIsMobile })
  return { __esModule: true, default: useBreakpoints, useBreakpoints }
})

function setup({ isNarrow = false, isPhone = false } = {}) {
  mockIsMobile = isNarrow
  isMobileDevice.mockReturnValue(isPhone)
  const { ComposerPrimitive } = jest.requireMock('@assistant-ui/react')
  render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <ComposerPrimitive.Root>
        <ConversationBar placeholder="Ask" />
      </ComposerPrimitive.Root>
    </I18n>
  )
  return screen.getByRole('textbox')
}

describe('ConversationBar', () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([
    ['a wide', false],
    ['a narrow', true]
  ])('sends the question on Enter in %s layout', (_, isNarrow) => {
    const input = setup({ isNarrow })

    fireEvent.keyDown(input, { key: 'Enter' })

    // A browser submits a nested form for real, which jsdom does not
    expect(input.closest('form').parentElement.closest('form')).toBe(null)
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('adds a line on Enter on a phone', () => {
    const input = setup({ isNarrow: true, isPhone: true })

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockSend).not.toHaveBeenCalled()
  })
})
