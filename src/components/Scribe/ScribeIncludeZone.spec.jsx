import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { CozyProvider, createMockClient } from 'cozy-client'
import { I18n, initTranslation } from 'twake-i18n'

import { ScribeIncludeZone } from '@/components/Scribe/ScribeIncludeZone'
import { ScribeProvider } from '@/components/Scribe/ScribeProvider'
import en from '@/locales/en.json'

let mockThread = { messages: [], isRunning: false }

jest.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: ({ children }) => children,
  useLocalRuntime: () => ({ thread: { getState: () => mockThread } }),
  useThread: selector => selector(mockThread)
}))

function renderZone({ isRunning = false, requestDocument = jest.fn() } = {}) {
  mockThread = { messages: [], isRunning }
  const client = createMockClient({})
  client.plugins = {
    realtime: { subscribe: jest.fn(), unsubscribe: jest.fn() }
  }

  render(
    <CozyProvider client={client}>
      <I18n lang="en" polyglot={initTranslation('en', () => en)}>
        <ScribeProvider conversationId="c1" requestDocument={requestDocument}>
          <ScribeIncludeZone />
        </ScribeProvider>
      </I18n>
    </CozyProvider>
  )

  return name => screen.queryByRole('checkbox', { name })
}

describe('ScribeIncludeZone', () => {
  it('offers the document, unchecked at first', () => {
    const getToggle = renderZone()
    expect(getToggle('Document')).not.toBeChecked()
    expect(getToggle('Conversation')).toBe(null)
    expect(getToggle('Selection')).toBe(null)

    fireEvent.click(getToggle('Document'))

    expect(getToggle('Document')).toBeChecked()
  })

  it('shows nothing when the app cannot give its document', () => {
    renderZone({ requestDocument: null })

    expect(screen.queryByRole('group', { name: 'Include' })).toBe(null)
  })

  it('does not change what is included while an answer is written', () => {
    const getToggle = renderZone({ isRunning: true })

    expect(getToggle('Document')).toBeDisabled()
  })
})
