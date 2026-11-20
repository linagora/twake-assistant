import { render, screen } from '@testing-library/react'
import React from 'react'

import KnowledgeBaseSection from './KnowledgeBaseSection'

jest.mock('cozy-flags', () => jest.fn(() => true))
jest.mock('cozy-client', () => ({
  ...jest.requireActual('cozy-client'),
  useQuery: () => ({
    data: { _id: 'folder-id', name: 'Meetings' },
    fetchStatus: 'loaded'
  })
}))
jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: key => key })
}))
jest.mock('./FolderPickerDialog', () => () => null)

describe('KnowledgeBaseSection', () => {
  it('gives the folder and mail crosses the 24px touch target of the folder chip', () => {
    render(
      <KnowledgeBaseSection
        knowledgeBase={[
          { doctype: 'io.cozy.files', dirId: 'folder-id' },
          { doctype: 'com.linagora.email' }
        ]}
        onChange={jest.fn()}
      />
    )

    for (const label of [
      'assistant.knowledge_base.remove',
      'assistant.knowledge_base.remove_emails'
    ]) {
      const cross = screen.getByLabelText(label)
      expect(cross).toHaveClass('folder-chip-remove')
      // An inline size would beat the padding of the rule
      expect(cross.getAttribute('style')).toBe(null)
    }
  })
})
