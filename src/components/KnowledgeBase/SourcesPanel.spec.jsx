import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { SourcesPanel } from './SourcesPanel'

jest.mock('cozy-client', () => ({
  useClient: () => ({
    getStackClient: () => ({ uri: 'https://alice.cozy.example' }),
    getInstanceOptions: () => ({ subdomain: 'flat' })
  }),
  generateWebLink: ({ hash }) => `https://alice-drive.cozy.example/#${hash}`
}))
jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: key => key })
}))

describe('SourcesPanel', () => {
  it('names the folder, links to it in Drive and closes', () => {
    const onClose = jest.fn()
    render(
      <SourcesPanel
        dirId="folder-id"
        folderName="Meeting recordings"
        onClose={onClose}
      />
    )

    expect(screen.queryByText('Meeting recordings')).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: /assistant.knowledge_base.open_folder/
      })
    ).toHaveAttribute(
      'href',
      'https://alice-drive.cozy.example/#/folder/folder-id'
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'assistant.sources_panel.close' })
    )

    expect(onClose).toHaveBeenCalled()
  })
})
