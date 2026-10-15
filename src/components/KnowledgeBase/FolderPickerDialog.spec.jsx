import { render, waitFor } from '@testing-library/react'
import React from 'react'

import CozyTheme from 'cozy-ui/transpiled/react/providers/CozyTheme'

import FolderPickerDialog from './FolderPickerDialog'

const mockCreate = jest.fn()

jest.mock('cozy-interapp', () =>
  jest.fn().mockImplementation(() => ({ create: mockCreate }))
)
jest.mock('cozy-client', () => ({
  useClient: () => ({})
}))
jest.mock('cozy-ui/transpiled/react/providers/Alert', () => ({
  useAlert: () => ({ showAlert: jest.fn() })
}))
jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: key => key })
}))

const pick = result => {
  mockCreate.mockReturnValue({ start: () => Promise.resolve(result) })
  const onSelect = jest.fn()
  const onClose = jest.fn()
  render(
    <CozyTheme>
      <FolderPickerDialog open onClose={onClose} onSelect={onSelect} />
    </CozyTheme>
  )
  return { onSelect, onClose }
}

describe('FolderPickerDialog', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('asks Drive for a single folder of the drive tab, as a document', async () => {
    pick([])

    await waitFor(() => expect(mockCreate).toHaveBeenCalled())
    expect(mockCreate).toHaveBeenCalledWith('PICK', 'io.cozy.files', {
      multiple: false,
      tabs: ['drive'],
      sharingLink: null,
      downloadLink: null,
      documents: {
        label: 'assistant.knowledge_base.select_folder',
        accept: ['folder']
      }
    })
  })

  it('selects the picked folder', async () => {
    const folder = { _id: 'folder-1', type: 'directory' }
    const { onSelect, onClose } = pick([folder])

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onSelect).toHaveBeenCalledWith(folder)
  })

  it('does not select a picked file', async () => {
    const { onSelect, onClose } = pick([{ _id: 'file-1', type: 'file' }])

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(onSelect).not.toHaveBeenCalled()
  })
})
