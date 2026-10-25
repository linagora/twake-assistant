import { copyAnswer } from '@/lib/clipboard'

const readBlob = blob =>
  new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsText(blob)
  })

const defineClipboard = clipboard =>
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true
  })

describe('copyAnswer', () => {
  const originalClipboardItem = global.ClipboardItem

  beforeEach(() => {
    global.ClipboardItem = class {
      constructor(items) {
        this.items = items
      }
    }
  })

  afterEach(() => {
    delete navigator.clipboard
    global.ClipboardItem = originalClipboardItem
  })

  it('writes the answer as HTML and text', async () => {
    const write = jest.fn().mockResolvedValue()
    defineClipboard({ write, writeText: jest.fn() })

    await expect(copyAnswer('a **b**')).resolves.toBe(true)

    expect(write).toHaveBeenCalledTimes(1)
    const [[item]] = write.mock.calls[0]
    expect(Object.keys(item.items)).toEqual(['text/html', 'text/plain'])
    expect(item.items['text/html'].type).toBe('text/html')
    expect(await readBlob(item.items['text/html'])).toBe('a <strong>b</strong>')
    expect(item.items['text/plain'].type).toBe('text/plain')
    expect(await readBlob(item.items['text/plain'])).toBe('a **b**')
  })

  it('keeps the paragraphs of an answer that has several', async () => {
    const write = jest.fn().mockResolvedValue()
    defineClipboard({ write })

    await copyAnswer('One\n\nTwo')

    const [[item]] = write.mock.calls[0]
    expect(await readBlob(item.items['text/html'])).toBe(
      '<p>One</p>\n<p>Two</p>'
    )
  })

  it('keeps a list as it is', async () => {
    const write = jest.fn().mockResolvedValue()
    defineClipboard({ write })

    await copyAnswer('- one\n- two')

    const [[item]] = write.mock.calls[0]
    expect(await readBlob(item.items['text/html'])).toBe(
      '<ul>\n<li>one</li>\n<li>two</li>\n</ul>'
    )
  })

  it('copies a table of the app in its fence as a table', async () => {
    const write = jest.fn().mockResolvedValue()
    defineClipboard({ write })

    await copyAnswer(
      '```\n<table><tr><td>a</td><td>**b**</td></tr></table>\n```'
    )

    const [[item]] = write.mock.calls[0]
    expect(await readBlob(item.items['text/plain'])).toBe(
      '| a | **b** |\n| --- | --- |'
    )
    expect(await readBlob(item.items['text/html'])).toMatch(
      /^<table>[\s\S]*<th>a<\/th>[\s\S]*<strong>b<\/strong>[\s\S]*<\/table>$/
    )
  })

  it('falls back to writeText without ClipboardItem', async () => {
    const write = jest.fn()
    const writeText = jest.fn().mockResolvedValue()
    delete global.ClipboardItem
    defineClipboard({ write, writeText })

    await expect(copyAnswer('a **b**')).resolves.toBe(true)

    expect(write).not.toHaveBeenCalled()
    expect(writeText).toHaveBeenCalledWith('a **b**')
  })

  it('falls back to writeText without write', async () => {
    const writeText = jest.fn().mockResolvedValue()
    defineClipboard({ writeText })

    await expect(copyAnswer('a **b**')).resolves.toBe(true)

    expect(writeText).toHaveBeenCalledWith('a **b**')
  })

  it('writes nothing, and tells it, without a way to write', async () => {
    defineClipboard({})

    await expect(copyAnswer('a **b**')).resolves.toBe(false)
  })

  it('writes nothing, and tells it, without a clipboard', async () => {
    await expect(copyAnswer('a **b**')).resolves.toBe(false)
  })

  it('lets a refused write reject', async () => {
    const error = new Error('NotAllowedError')
    defineClipboard({ write: jest.fn().mockRejectedValue(error) })

    await expect(copyAnswer('a **b**')).rejects.toBe(error)
  })
})
