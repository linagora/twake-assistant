import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { I18n, initTranslation } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeSuggestions } from '@/components/Scribe/ScribeSuggestions'
import en from '@/locales/en.json'

const mockComposer = { setText: jest.fn(), send: jest.fn() }

jest.mock('@assistant-ui/react', () => ({
  useComposerRuntime: () => mockComposer
}))
jest.mock('@/components/Scribe/ScribeProvider', () => ({
  useScribe: jest.fn()
}))

function renderSuggestions(suggestions) {
  useScribe.mockReturnValue({ suggestions })

  return render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <BreakpointsProvider>
        <ScribeSuggestions />
      </BreakpointsProvider>
    </I18n>
  )
}

describe('ScribeSuggestions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sends the prompt of a chip', () => {
    renderSuggestions([{ name: 'fix', label: 'Fix', prompt: 'Fix the text.' }])

    fireEvent.click(screen.getByRole('button', { name: 'Fix' }))

    expect(mockComposer.setText).toHaveBeenCalledWith('Fix the text.')
    expect(mockComposer.send).toHaveBeenCalledTimes(1)
  })

  it('offers the prompts of a chip in a menu', () => {
    renderSuggestions([
      {
        name: 'translate',
        label: 'Translate',
        options: [
          { name: 'en', label: 'English', prompt: 'Translate into English.' },
          { name: 'fr', label: 'French', prompt: 'Translate into French.' }
        ]
      }
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Translate' }))
    expect(mockComposer.send).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('French'))

    expect(mockComposer.setText).toHaveBeenCalledWith('Translate into French.')
    expect(mockComposer.send).toHaveBeenCalledTimes(1)
  })

  it('shows nothing without prompts', () => {
    const { container } = renderSuggestions([])

    expect(container).toBeEmptyDOMElement()
  })
})
