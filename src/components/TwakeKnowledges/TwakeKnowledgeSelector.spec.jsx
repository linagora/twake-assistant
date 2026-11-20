import { render, screen } from '@testing-library/react'
import React from 'react'

import { useSelectedAssistantKnowledgeBase } from '../KnowledgeBase/useSelectedAssistantKnowledgeBase'
import TwakeKnowledgeSelector from './TwakeKnowledgeSelector'

jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: key => key })
}))
jest.mock('../KnowledgeBase/useSelectedAssistantKnowledgeBase', () => ({
  useSelectedAssistantKnowledgeBase: jest.fn()
}))
jest.mock('../KnowledgeBase/KnowledgeBaseChip', () => ({ folderName }) => (
  <button type="button">{folderName}</button>
))

describe('TwakeKnowledgeSelector', () => {
  it('shows the chip of a folder that is gone', () => {
    useSelectedAssistantKnowledgeBase.mockReturnValue({
      dirId: 'x',
      hasFolder: false,
      isUnavailable: true,
      folderName: 'Folder unavailable'
    })

    render(<TwakeKnowledgeSelector />)

    expect(
      screen.queryByRole('button', { name: 'Folder unavailable' })
    ).toBeInTheDocument()
  })

  it('shows no chip without a folder', () => {
    useSelectedAssistantKnowledgeBase.mockReturnValue({
      dirId: null,
      hasFolder: false,
      isUnavailable: false,
      folderName: '…'
    })

    render(<TwakeKnowledgeSelector />)

    expect(screen.queryByRole('button')).toBe(null)
  })
})
