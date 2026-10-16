import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { CozyProvider, createMockClient } from 'cozy-client'
import AlertProvider from 'cozy-ui/transpiled/react/providers/Alert'
import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import CozyTheme from 'cozy-ui/transpiled/react/providers/CozyTheme'
import { I18n, initTranslation } from 'twake-i18n'

import ConversationActions from '@/components/Conversations/ConversationActions'
import en from '@/locales/en.json'

jest.mock('cozy-flags', () => ({ __esModule: true, default: () => false }))

describe('ConversationActions', () => {
  it('renames a conversation without the assistant shown with it', async () => {
    const client = createMockClient({})
    render(
      <CozyProvider client={client}>
        <I18n lang="en" polyglot={initTranslation('en', () => en)}>
          <CozyTheme>
            <BreakpointsProvider>
              <AlertProvider>
                <ConversationActions
                  conversation={{
                    _id: 'c1',
                    _rev: '1-a',
                    name: 'Old name',
                    relationships: {
                      assistant: { data: { _id: 'a1', _type: 'assistants' } }
                    },
                    assistant: { _id: 'a1', name: 'Assistant' }
                  }}
                />
              </AlertProvider>
            </BreakpointsProvider>
          </CozyTheme>
        </I18n>
      </CozyProvider>
    )

    fireEvent.click(screen.getByRole('button', { expanded: false }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'New name' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    await waitFor(() => expect(client.save).toHaveBeenCalled())
    const saved = client.save.mock.calls[0][0]
    expect(saved).toEqual(
      expect.objectContaining({
        _id: 'c1',
        name: 'New name',
        relationships: {
          assistant: { data: { _id: 'a1', _type: 'assistants' } }
        }
      })
    )
    expect(saved).not.toHaveProperty('assistant')
  })
})
