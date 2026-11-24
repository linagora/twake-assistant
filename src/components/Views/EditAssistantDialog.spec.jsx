import { render, screen, waitFor } from '@testing-library/react'
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
jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: key => key })
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

  it('is named by its title', () => {
    renderDialog(jest.fn().mockReturnValue(new Promise(() => {})))

    expect(
      screen.queryByRole('dialog', { name: 'assistant_edit.title' })
    ).not.toBe(null)
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
})
