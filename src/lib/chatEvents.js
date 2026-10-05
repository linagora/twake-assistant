const LAST_EVENTS = ['done', 'error']

/**
 * The realtime events of an answer (io.cozy.ai.chat.events). They carry the
 * id of the message they answer, which the stack gives in its response to
 * the request: they may come before it, so they are kept until they are
 * read. The events of another conversation of the user come on the same
 * channel: reading by id leaves them out.
 */
export class ChatEventStream {
  constructor() {
    this.eventsById = new Map()
    this.wakeUps = new Set()
  }

  /**
   * @param {{ _id: string, object: string }} event - a realtime event
   */
  push(event) {
    if (typeof event?._id !== 'string') return

    const events = this.eventsById.get(event._id) ?? []
    events.push(event)
    this.eventsById.set(event._id, events)
    this.wakeUps.forEach(wakeUp => wakeUp())
  }

  /**
   * Forgets the events kept so far, before a new request
   */
  clear() {
    this.eventsById.clear()
  }

  /**
   * The events of a message, in the order they came, up to the one that
   * ends its answer
   *
   * @param {string} messageId - the id of the message that is answered
   * @param {AbortSignal} [abortSignal] - stops the reading
   * @returns {AsyncGenerator<object>}
   */
  async *read(messageId, abortSignal) {
    let position = 0

    while (!abortSignal?.aborted) {
      const events = this.eventsById.get(messageId) ?? []

      while (position < events.length) {
        const event = events[position]
        position += 1
        yield event
        if (LAST_EVENTS.includes(event.object)) return
      }

      await this.waitForEvent(abortSignal)
    }
  }

  waitForEvent(abortSignal) {
    return new Promise(resolve => {
      const wakeUp = () => {
        this.wakeUps.delete(wakeUp)
        abortSignal?.removeEventListener('abort', wakeUp)
        resolve()
      }

      this.wakeUps.add(wakeUp)
      abortSignal?.addEventListener('abort', wakeUp)
    })
  }
}
