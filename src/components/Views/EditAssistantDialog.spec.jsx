import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { CozyProvider, createMockClient } from 'cozy-client'
import CozyTheme from 'cozy-ui/transpiled/react/providers/CozyTheme'

import EditAssistantDialog from './EditAssistantDialog'

const mockShowAlert = jest.fn()

jest.mock('cozy-ui/transpiled/react/providers/Alert', () => ({
  useAlert: () => ({ showAlert: mockShowAlert })
}))
jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const useBreakpoints = () => ({ isMobile: false })
  return { __esModule: true, default: useBreakpoints, useBreakpoints }
})
// Stable, as the real one: the fetch effect depends on `t`
const mockT = key => key
jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: mockT })
}))
jest.mock('../AssistantProvider', () => ({
  useAssistant: () => ({ assistantIdInAction: 'assistant-id' })
}))
jest.mock('../CreateAssistantSteps/AssistantDialogContent', () => () => null)

const renderDialog = query => {
  const client = createMockClient({})
  client.query = query
  const onClose = jest.fn()
  render(
    <CozyProvider client={client}>
      <CozyTheme>
        <EditAssistantDialog open onClose={onClose} />
      </CozyTheme>
    </CozyProvider>
  )
  return { onClose }
}

describe('EditAssistantDialog', () => {
  beforeEach(() => {
    mockShowAlert.mockReset()
  })

  it('shows an error and closes when the assistant cannot be fetched', async () => {
    const { onClose } = renderDialog(
      jest.fn().mockRejectedValue(new Error('500'))
    )

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mockShowAlert).toHaveBeenCalledWith({
      message: 'assistant_edit.load_error',
      severity: 'error'
    })
  })

  it('shows an error and closes when the assistant does not exist', async () => {
    const { onClose } = renderDialog(
      jest.fn().mockResolvedValue({ data: null })
    )

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mockShowAlert).toHaveBeenCalledWith({
      message: 'assistant_edit.load_error',
      severity: 'error'
    })
  })

  it('goes back with Back after the first step, and closes with Cancel on it', async () => {
    const { onClose } = renderDialog(
      jest.fn().mockResolvedValue({ data: { name: 'Cook' }, included: [] })
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'assistant_edit.buttons.next' })
      ).toBeEnabled()
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'assistant_edit.buttons.next' })
    )
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'assistant_create.buttons.back'
      })
    )
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'assistant_edit.buttons.cancel'
      })
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
