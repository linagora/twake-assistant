import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import AlertProvider from 'cozy-ui/transpiled/react/providers/Alert'
import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { I18n, initTranslation } from 'twake-i18n'

import ConversationActions from './ConversationActions'

import { remove } from '@/actions/delete'
import { rename } from '@/actions/rename'
import en from '@/locales/en.json'

const mockSave = jest.fn()

jest.mock('cozy-client', () => ({
  ...jest.requireActual('cozy-client'),
  useClient: () => ({ save: mockSave })
}))

describe('ConversationActions', () => {
  it('renames the conversation from a labelled field', async () => {
    render(
      <I18n lang="en" polyglot={initTranslation('en', () => en)}>
        <BreakpointsProvider>
          <AlertProvider>
            <ConversationActions
              actions={[rename]}
              conversation={{ _id: 'c1', name: 'Old name' }}
            />
          </AlertProvider>
        </BreakpointsProvider>
      </I18n>
    )

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByText('Rename'))
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Conversation name' }),
      { target: { value: 'New name' } }
    )
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'c1', name: 'New name' })
    )
  })

  it('opens the deletion with the focus on Cancel', async () => {
    render(
      <I18n lang="en" polyglot={initTranslation('en', () => en)}>
        <BreakpointsProvider>
          <AlertProvider>
            <ConversationActions
              actions={[remove]}
              conversation={{ _id: 'c1', name: 'Old name' }}
            />
          </AlertProvider>
        </BreakpointsProvider>
      </I18n>
    )

    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    )
  })
})
