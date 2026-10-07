import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { useQuery } from 'cozy-client'
import { I18n, initTranslation } from 'twake-i18n'

import { ScribeSources } from '@/components/Scribe/ScribeSources'
import en from '@/locales/en.json'

jest.mock('cozy-client', () => ({
  ...jest.requireActual('cozy-client'),
  useClient: () => ({
    getStackClient: () => ({ uri: 'https://alice.cozy.example' }),
    getInstanceOptions: () => ({ subdomain: 'nested' })
  }),
  useQuery: jest.fn()
}))

function renderSources(sources, files) {
  useQuery.mockReturnValue({ data: files })

  return render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <ScribeSources sources={sources} />
    </I18n>
  )
}

describe('ScribeSources', () => {
  const sources = [
    { id: 'f1', doctype: 'io.cozy.files' },
    { sourceType: 'web', url: 'https://a.example', title: 'Page A' }
  ]
  const files = [
    {
      _id: 'f1',
      name: 'Report.pdf',
      path: '/Work/Report.pdf',
      mime: 'application/pdf',
      dir_id: 'd1',
      type: 'file'
    }
  ]

  it('shows the sources once the user opens them', () => {
    renderSources(sources, files)

    expect(screen.queryByText('2 sources')).toBeInTheDocument()
    expect(screen.queryByText('Report.pdf')).toBe(null)

    fireEvent.click(screen.getByText('2 sources'))

    expect(screen.queryByText('Report.pdf')).toBeInTheDocument()
    expect(screen.queryByText('/Work/')).toBeInTheDocument()
    expect(screen.getByText('Page A').closest('a').href).toBe(
      'https://a.example/'
    )
  })

  it('shows nothing without a source the user can open', () => {
    renderSources([{ id: 'f1', doctype: 'io.cozy.files' }], [])

    expect(screen.queryByText(/source/)).toBe(null)
  })
})
