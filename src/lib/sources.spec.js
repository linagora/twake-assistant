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
        { _id: 'f1', name: 'Report.pdf', dir_id: 'd1', type: 'file' },
        {
          _id: 'n1',
          name: 'Meeting.cozy-note',
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
        href: 'https://drive.alice.cozy.example/#/folder/d1/file/f1'
      },
      {
        key: 'file:n1',
        label: 'Meeting.cozy-note',
        href: 'https://notes.alice.cozy.example/#/n/n1'
      }
    ])
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
        href: 'https://a.example'
      },
      {
        key: 'web:https://b.example',
        label: 'https://b.example',
        href: 'https://b.example'
      }
    ])
  })
})
