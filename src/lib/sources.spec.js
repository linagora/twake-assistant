import {
  FileTypeNote,
  FileTypePdf,
  FileTypeText,
  Globe
} from '@linagora/twake-icons'

import { getFileSourceIds, makeSourceLinks } from '@/lib/sources'

const mockClient = {
  getStackClient: () => ({ uri: 'https://alice.cozy.example' }),
  getInstanceOptions: () => ({ subdomain: 'nested' })
}

describe('getFileSourceIds', () => {
  it('gives each file once, and only the files', () => {
    expect(
      getFileSourceIds([
        { id: 'f1', doctype: 'io.cozy.files' },
        { id: 'f1', doctype: 'io.cozy.files' },
        { id: 'f2', doctype: 'io.cozy.files' },
        { id: 'e1', doctype: 'com.linagora.email' },
        { sourceType: 'web', url: 'https://example.org' },
        { doctype: 'io.cozy.files' }
      ])
    ).toEqual(['f1', 'f2'])
  })
})

describe('makeSourceLinks', () => {
  it('links a file to Drive and a note to Notes', () => {
    const links = makeSourceLinks({
      sources: [],
      files: [
        {
          _id: 'f1',
          name: 'Report.pdf',
          path: '/Work/2026/Report.pdf',
          mime: 'application/pdf',
          dir_id: 'd1',
          type: 'file'
        },
        {
          _id: 'n1',
          name: 'Meeting.cozy-note',
          path: '/Notes/Meeting.cozy-note',
          mime: 'text/vnd.cozy.note+markdown',
          dir_id: 'd1',
          type: 'file',
          metadata: { content: {}, schema: {}, title: 'Meeting', version: 1 }
        }
      ],
      client: mockClient
    })

    expect(links).toEqual([
      {
        key: 'file:f1',
        label: 'Report.pdf',
        secondary: '/Work/2026/',
        href: 'https://drive.alice.cozy.example/#/folder/d1/file/f1',
        icon: FileTypePdf
      },
      {
        key: 'file:n1',
        label: 'Meeting.cozy-note',
        secondary: '/Notes/',
        href: 'https://notes.alice.cozy.example/#/n/n1',
        icon: FileTypeNote
      }
    ])
  })

  it('gives an icon to a file of any type, and no folder without a path', () => {
    const [link] = makeSourceLinks({
      sources: [],
      files: [{ _id: 'f1', name: 'notes.txt', dir_id: 'd1', type: 'file' }],
      client: mockClient
    })

    expect(link.icon).toBe(FileTypeText)
    expect(link.secondary).toBe(null)
  })

  it('links each web page once, by its title or its address', () => {
    const links = makeSourceLinks({
      sources: [
        { sourceType: 'web', url: 'https://a.example', title: 'Page A' },
        { sourceType: 'web', url: 'https://a.example', title: 'Page A' },
        { sourceType: 'web', url: 'https://b.example' },
        { sourceType: 'web' }
      ],
      files: [],
      client: mockClient
    })

    expect(links).toEqual([
      {
        key: 'web:https://a.example',
        label: 'Page A',
        secondary: 'https://a.example',
        href: 'https://a.example',
        icon: Globe
      },
      {
        key: 'web:https://b.example',
        label: 'https://b.example',
        secondary: 'https://b.example',
        href: 'https://b.example',
        icon: Globe
      }
    ])
  })
})
