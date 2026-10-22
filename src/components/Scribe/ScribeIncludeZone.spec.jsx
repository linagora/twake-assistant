import { fireEvent, render, screen, within } from '@testing-library/react'
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

function renderZone({
  text = 'Bonjour',
  isRunning = false,
  requestDocument = jest.fn()
} = {}) {
  mockThread = { messages: [], isRunning }
  const client = createMockClient({})
  client.plugins = {
    realtime: { subscribe: jest.fn(), unsubscribe: jest.fn() }
  }

  render(
    <CozyProvider client={client}>
      <I18n lang="en" polyglot={initTranslation('en', () => en)}>
        <ScribeProvider
          conversationId="c1"
          text={text}
          requestDocument={requestDocument}
        >
          <ScribeIncludeZone />
        </ScribeProvider>
      </I18n>
    </CozyProvider>
  )

  const group = screen.getByRole('group', { name: 'Include' })
  return name => within(group).queryByRole('checkbox', { name })
}

describe('ScribeIncludeZone', () => {
  it('offers the three toggles with their defaults', () => {
    const getToggle = renderZone()
    expect(getToggle('Document')).not.toBeChecked()
    expect(getToggle('Conversation')).toBeChecked()
    expect(getToggle('Selection')).toBeChecked()

    fireEvent.click(getToggle('Document'))
    fireEvent.click(getToggle('Conversation'))
    fireEvent.click(getToggle('Selection'))

    expect(getToggle('Document')).toBeChecked()
    expect(getToggle('Conversation')).not.toBeChecked()
    expect(getToggle('Selection')).not.toBeChecked()
  })

  it('hides the selection toggle without a text', () => {
    const getToggle = renderZone({ text: '' })

    expect(getToggle('Document')).toBeInTheDocument()
    expect(getToggle('Conversation')).toBeInTheDocument()
    expect(getToggle('Selection')).toBe(null)
  })

  it('hides the document toggle when the app cannot give its document', () => {
    const getToggle = renderZone({ requestDocument: null })

    expect(getToggle('Document')).toBe(null)
    expect(getToggle('Conversation')).toBeInTheDocument()
    expect(getToggle('Selection')).toBeInTheDocument()
  })

  it('does not change what is included while an answer is written', () => {
    const getToggle = renderZone({ isRunning: true })

    expect(getToggle('Document')).toBeDisabled()
    expect(getToggle('Conversation')).toBeDisabled()
    expect(getToggle('Selection')).toBeDisabled()
  })
})
