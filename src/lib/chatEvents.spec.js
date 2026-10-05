import { ChatEventStream } from '@/lib/chatEvents'

async function readAll(stream, messageId, abortSignal) {
  const events = []
  for await (const event of stream.read(messageId, abortSignal)) {
    events.push(event)
  }
  return events
}

describe('ChatEventStream', () => {
  it('gives the events of a message up to the end of its answer', async () => {
    const stream = new ChatEventStream()
    const reading = readAll(stream, 'm1')

    stream.push({ _id: 'm1', object: 'delta', content: 'Hello' })
    stream.push({ _id: 'm1', object: 'delta', content: ' world' })
    stream.push({ _id: 'm1', object: 'done' })
    stream.push({ _id: 'm1', object: 'delta', content: 'too late' })

    expect(await reading).toEqual([
      { _id: 'm1', object: 'delta', content: 'Hello' },
      { _id: 'm1', object: 'delta', content: ' world' },
      { _id: 'm1', object: 'done' }
    ])
  })

  it('keeps the events that come before they are read', async () => {
    const stream = new ChatEventStream()
    stream.push({ _id: 'm1', object: 'delta', content: 'Hello' })
    stream.push({ _id: 'm1', object: 'done' })

    expect(await readAll(stream, 'm1')).toHaveLength(2)
  })

  it('leaves out the events of another message', async () => {
    const stream = new ChatEventStream()
    const reading = readAll(stream, 'm1')

    stream.push({ _id: 'm2', object: 'delta', content: 'Other' })
    stream.push({ _id: 'm1', object: 'delta', content: 'Mine' })
    stream.push({ _id: 'm2', object: 'done' })
    stream.push({ _id: 'm1', object: 'error', message: 'failed' })

    expect(await reading).toEqual([
      { _id: 'm1', object: 'delta', content: 'Mine' },
      { _id: 'm1', object: 'error', message: 'failed' }
    ])
  })

  it('ignores what is not an event', async () => {
    const stream = new ChatEventStream()
    stream.push(null)
    stream.push({ object: 'delta', content: 'No id' })
    stream.push({ _id: 'm1', object: 'done' })

    expect(await readAll(stream, 'm1')).toEqual([{ _id: 'm1', object: 'done' }])
  })

  it('stops reading when it is aborted', async () => {
    const stream = new ChatEventStream()
    const controller = new AbortController()
    const reading = readAll(stream, 'm1', controller.signal)

    stream.push({ _id: 'm1', object: 'delta', content: 'Hello' })
    await new Promise(resolve => setTimeout(resolve, 0))
    controller.abort()

    expect(await reading).toEqual([
      { _id: 'm1', object: 'delta', content: 'Hello' }
    ])
  })

  it('forgets the events when it is cleared', async () => {
    const stream = new ChatEventStream()
    const controller = new AbortController()
    stream.push({ _id: 'm1', object: 'done' })
    stream.clear()

    const reading = readAll(stream, 'm1', controller.signal)
    controller.abort()

    expect(await reading).toEqual([])
  })
})
