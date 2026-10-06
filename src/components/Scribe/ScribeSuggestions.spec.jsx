import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { I18n, initTranslation } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeSuggestions } from '@/components/Scribe/ScribeSuggestions'
import en from '@/locales/en.json'

const mockComposer = {
  setText: jest.fn(),
  setRunConfig: jest.fn(),
  send: jest.fn()
}

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

  it('sends the request of a chip, with its prompt of the catalogue', () => {
    renderSuggestions([
      {
        name: 'correct',
        label: 'Correct',
        request: 'Correct the text.',
        prompt: 'correct-grammar'
      }
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Correct' }))

    expect(mockComposer.setText).toHaveBeenCalledWith('Correct the text.')
    expect(mockComposer.setRunConfig).toHaveBeenCalledWith({
      custom: { prompt: 'correct-grammar' }
    })
    expect(mockComposer.send).toHaveBeenCalledTimes(1)
    // The next message, typed, is sent without the prompt
    expect(mockComposer.setRunConfig).toHaveBeenLastCalledWith({})
  })

  it('offers the prompts of a chip in a menu', () => {
    renderSuggestions([
      {
        name: 'translate',
        label: 'Translate',
        options: [
          {
            name: 'english',
            label: 'English',
            request: 'Translate into English.',
            prompt: 'translate-english'
          },
          {
            name: 'french',
            label: 'French',
            request: 'Translate into French.',
            prompt: 'translate-french'
          }
        ]
      }
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Translate' }))
    expect(mockComposer.send).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('French'))

    expect(mockComposer.setText).toHaveBeenCalledWith('Translate into French.')
    expect(mockComposer.setRunConfig).toHaveBeenCalledWith({
      custom: { prompt: 'translate-french' }
    })
    expect(mockComposer.send).toHaveBeenCalledTimes(1)
  })

  it('shows nothing without prompts', () => {
    const { container } = renderSuggestions([])

    expect(container).toBeEmptyDOMElement()
  })
})
