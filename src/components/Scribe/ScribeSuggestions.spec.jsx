import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { I18n, initTranslation } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeSuggestions } from '@/components/Scribe/ScribeSuggestions'
import en from '@/locales/en.json'

const mockThread = { append: jest.fn() }

jest.mock('@assistant-ui/react', () => ({
  useThreadRuntime: () => mockThread
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

    expect(mockThread.append).toHaveBeenCalledTimes(1)
    expect(mockThread.append).toHaveBeenCalledWith({
      role: 'user',
      content: [{ type: 'text', text: 'Correct the text.' }],
      metadata: { custom: { prompt: 'correct-grammar' } },
      runConfig: { custom: { prompt: 'correct-grammar' } }
    })
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
    expect(mockThread.append).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('French'))

    expect(mockThread.append).toHaveBeenCalledWith({
      role: 'user',
      content: [{ type: 'text', text: 'Translate into French.' }],
      metadata: { custom: { prompt: 'translate-french' } },
      runConfig: { custom: { prompt: 'translate-french' } }
    })
  })

  it('shows nothing without prompts', () => {
    const { container } = renderSuggestions([])

    expect(container).toBeEmptyDOMElement()
  })
})
