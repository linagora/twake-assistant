import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import React from 'react'

import { CozyProvider, createMockClient } from 'cozy-client'
import AlertProvider from 'cozy-ui/transpiled/react/providers/Alert'
import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import CozyTheme from 'cozy-ui/transpiled/react/providers/CozyTheme'
import { I18n, initTranslation } from 'twake-i18n'

import { ScribeView } from '@/components/Scribe/ScribeView'
import { DOCTYPE_AI_CHAT_CONVERSATIONS } from '@/doctypes'
import en from '@/locales/en.json'
import { buildConversationsQuery } from '@/queries'

jest.mock('@assistant-ui/react', () => ({}))
jest.mock('cozy-client', () => ({
  ...jest.requireActual('cozy-client'),
  RealTimeQueries: () => null
}))
jest.mock('@/components/Scribe/ScribeProvider', () => ({
  ScribeProvider: ({ conversationId }) => (
    <p data-testid="conversation">{conversationId}</p>
  )
}))

const conversationsQuery = buildConversationsQuery()

const makeConversation = (id, request) => ({
  _id: id,
  messages: [{ id: `${id}-q`, role: 'user', content: request }],
  cozyMetadata: { updatedAt: '2026-10-15T10:00:00.000Z' }
})

function setup() {
  const client = createMockClient({
    queries: {
      [conversationsQuery.options.as]: {
        doctype: DOCTYPE_AI_CHAT_CONVERSATIONS,
        definition: conversationsQuery.definition(),
        data: [
          makeConversation('c1', 'Open request'),
          makeConversation('c2', 'Other request')
        ]
      }
    }
  })
  client.destroy = jest.fn().mockResolvedValue({})
  client.save = jest.fn().mockResolvedValue({})
  render(
    <CozyProvider client={client}>
      <I18n lang="en" polyglot={initTranslation('en', () => en)}>
        <CozyTheme>
          <BreakpointsProvider>
            <AlertProvider>
              <ScribeView />
            </AlertProvider>
          </BreakpointsProvider>
        </CozyTheme>
      </I18n>
    </CozyProvider>
  )
  return client
}

const openHistory = () =>
  fireEvent.click(screen.getByRole('button', { name: 'History' }))

function openMenuOf(request) {
  const item = screen.getByText(request).closest('li')
  fireEvent.click(within(item).getByRole('button', { expanded: false }))
}

async function deleteConversation(request) {
  openMenuOf(request)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' })
  )
  await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
}

describe('ScribeView', () => {
  it('asks for a confirmation before it deletes a conversation', () => {
    const client = setup()
    openHistory()

    openMenuOf('Other request')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))

    expect(screen.queryByRole('dialog')).toBeInTheDocument()
    expect(client.destroy).not.toHaveBeenCalled()

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel'
      })
    )

    expect(screen.queryByRole('dialog')).toBe(null)
    expect(client.destroy).not.toHaveBeenCalled()
  })

  it('renames a conversation', async () => {
    const client = setup()
    openHistory()

    openMenuOf('Other request')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'New name' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
    expect(client.save).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'c2', name: 'New name' })
    )
  })

  it('starts a new conversation when the one on screen is deleted', async () => {
    const client = setup()
    openHistory()
    fireEvent.click(screen.getByText('Open request'))
    expect(screen.getByTestId('conversation')).toHaveTextContent('c1')
    openHistory()

    await deleteConversation('Open request')

    expect(client.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'c1' })
    )
    expect(screen.getByTestId('conversation')).toHaveTextContent(/^\d+-\d{5}$/)
  })

  it('keeps the conversation on screen when another one is deleted', async () => {
    const client = setup()
    openHistory()
    fireEvent.click(screen.getByText('Open request'))
    openHistory()

    await deleteConversation('Other request')

    expect(client.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'c2' })
    )
    expect(screen.getByTestId('conversation')).toHaveTextContent('c1')
  })
})
