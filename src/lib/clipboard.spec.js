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
    delete document.execCommand
    global.ClipboardItem = originalClipboardItem
  })

  // jsdom has no copy command: it fires the copy event as a browser does
  const defineCopyCommand = isAllowed => {
    const clipboardData = { setData: jest.fn() }
    document.execCommand = jest.fn(() => {
      if (!isAllowed) return false
      const event = new Event('copy', { cancelable: true })
      event.clipboardData = clipboardData
      document.dispatchEvent(event)
      return true
    })
    return clipboardData
  }

  it('writes the answer as HTML and text', async () => {
    const write = jest.fn().mockResolvedValue()
    defineClipboard({ write })

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

  it('copies with the copy command without ClipboardItem', async () => {
    const write = jest.fn()
    delete global.ClipboardItem
    defineClipboard({ write })
    const clipboardData = defineCopyCommand(true)

    await expect(copyAnswer('a **b**')).resolves.toBe(true)

    expect(write).not.toHaveBeenCalled()
    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'a **b**')
  })

  it('copies with the copy command without write', async () => {
    defineClipboard({})
    const clipboardData = defineCopyCommand(true)

    await expect(copyAnswer('a **b**')).resolves.toBe(true)

    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(clipboardData.setData.mock.calls).toEqual([
      ['text/html', 'a <strong>b</strong>'],
      ['text/plain', 'a **b**']
    ])
  })

  it('copies with the copy command without a clipboard', async () => {
    defineCopyCommand(true)

    await expect(copyAnswer('a **b**')).resolves.toBe(true)
  })

  it('copies with the copy command when the write is refused', async () => {
    defineClipboard({
      write: jest.fn().mockRejectedValue(new Error('NotAllowedError'))
    })
    const clipboardData = defineCopyCommand(true)

    await expect(copyAnswer('a **b**')).resolves.toBe(true)

    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'a **b**')
  })

  it('tells nothing was copied when the copy command is refused too', async () => {
    defineClipboard({
      write: jest.fn().mockRejectedValue(new Error('NotAllowedError'))
    })
    defineCopyCommand(false)

    await expect(copyAnswer('a **b**')).resolves.toBe(false)
  })

  it('lets no copy listener behind', async () => {
    const clipboardData = defineCopyCommand(true)
    await copyAnswer('a')
    clipboardData.setData.mockClear()

    document.dispatchEvent(new Event('copy'))

    expect(clipboardData.setData).not.toHaveBeenCalled()
  })
})
