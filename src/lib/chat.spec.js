import { makeChat, makeChatAdapter, removeSourceMarks } from '@/lib/chat'
import { ChatEventStream } from '@/lib/chatEvents'

jest.mock('cozy-minilog', () => () => ({ error: jest.fn() }))

const userMessage = text => ({
  role: 'user',
  content: [{ type: 'text', text }]
})
const assistantMessage = text => ({
  role: 'assistant',
  content: [{ type: 'text', text }]
})

// The stack answers with the conversation, then the events of the answer
// come: here as soon as the message is posted
function setup({ events: answerEvents = [], options = {}, messageId = 'q1' }) {
  const events = new ChatEventStream()
  const fetchJSON = jest.fn(async (method, path) => {
    if (path.endsWith('/cancel')) return null
    answerEvents.forEach(event => events.push({ _id: messageId, ...event }))
    return {
      data: { attributes: { messages: [{ id: messageId, role: 'user' }] } }
    }
  })
  const adapter = makeChatAdapter({
    client: { stackClient: { fetchJSON } },
    conversationId: 'c1',
    events,
    getRequest: () => ({
      prepareQuery: text => text,
      hasDocuments: false,
      instructions: null,
      ...options
    })
  })

  return { adapter, events, fetchJSON }
}

async function run(adapter, messages, abortSignal, runConfig) {
  const results = []
  for await (const result of adapter.run({
    messages,
    abortSignal,
    runConfig
  })) {
    results.push(result)
  }
  return results
}

const getText = result => result.content[0].text

describe('makeChatAdapter', () => {
  it('asks the LLM alone, and gives its answer as it comes', async () => {
    const { adapter, fetchJSON } = setup({
      events: [
        { object: 'delta', content: 'Bonjour', position: 0 },
        { object: 'delta', content: ' à tous', position: 1 },
        { object: 'done' }
      ]
    })

    const results = await run(adapter, [userMessage('Fix it')])

    expect(fetchJSON).toHaveBeenCalledWith(
      'POST',
      '/ai/chat/conversations/c1',
      { q: 'Fix it', documents: false }
    )
    expect(results.map(getText)).toEqual([
      'Bonjour',
      'Bonjour à tous',
      'Bonjour à tous'
    ])
    expect(results.at(-1).status).toEqual({ type: 'complete', reason: 'stop' })
    expect(results.at(-1).metadata.custom).toEqual({})
  })

  it('prepares the query of the first message, then of the next ones', async () => {
    const prepareQuery = jest.fn((text, { isFirstOnText }) =>
      isFirstOnText ? `${text} + the text` : text
    )
    const { adapter, fetchJSON } = setup({
      events: [{ object: 'done' }],
      options: { prepareQuery }
    })

    await run(adapter, [userMessage('Fix it')])
    await run(adapter, [
      userMessage('Fix it'),
      assistantMessage('Fixed'),
      userMessage('Shorter')
    ])

    expect(fetchJSON.mock.calls.map(call => call[2].q)).toEqual([
      'Fix it + the text',
      'Shorter'
    ])
  })

  it('sends the prompt of the catalogue of a suggestion', async () => {
    const preparePrompt = jest.fn(name =>
      name === 'make-shorter'
        ? { q: 'INSTRUCTION: shorter TEXT: Bonjour', instructions: 'Edit only' }
        : null
    )
    const { adapter, fetchJSON } = setup({
      events: [{ object: 'done' }],
      options: { preparePrompt, instructions: 'Scribe' }
    })

    const results = []
    for await (const result of adapter.run({
      messages: [userMessage('Make the text shorter.')],
      runConfig: { custom: { prompt: 'make-shorter' } }
    })) {
      results.push(result)
    }
    await run(adapter, [userMessage('Fix it')])

    expect(fetchJSON.mock.calls.map(call => call[2])).toEqual([
      {
        q: 'INSTRUCTION: shorter TEXT: Bonjour',
        documents: false,
        instructions: 'Edit only'
      },
      { q: 'Fix it', documents: false, instructions: 'Scribe' }
    ])
  })

  it('sends the instructions of the scribe', async () => {
    const { adapter, fetchJSON } = setup({
      events: [{ object: 'done' }],
      options: { instructions: 'Answer with the text only' }
    })

    await run(adapter, [userMessage('Fix it')])

    expect(fetchJSON.mock.calls[0][2]).toEqual({
      q: 'Fix it',
      documents: false,
      instructions: 'Answer with the text only'
    })
  })

  it('answers from the documents when the user asks for them', async () => {
    const sources = [{ id: 'f1', doctype: 'io.cozy.files' }]
    const { adapter, fetchJSON } = setup({
      events: [
        { object: 'delta', content: 'The budget is 420 000 € [doc_1].' },
        { object: 'sources', content: sources },
        { object: 'done' }
      ],
      options: { hasDocuments: true }
    })

    const results = await run(adapter, [userMessage('What is the budget?')])

    expect(fetchJSON.mock.calls[0][2]).toEqual({ q: 'What is the budget?' })
    expect(getText(results.at(-1))).toBe('The budget is 420 000 €.')
    expect(results.at(-1).metadata.custom).toEqual({ sources })
  })

  it('asks the assistant chosen by the user, with the web', async () => {
    const { adapter, fetchJSON } = setup({
      events: [{ object: 'done' }],
      options: { hasDocuments: true, assistantId: 'a1', websearch: true }
    })

    await run(adapter, [userMessage('What is new?')])

    expect(fetchJSON.mock.calls[0][2]).toEqual({
      q: 'What is new?',
      assistantID: 'a1',
      websearch: true
    })
  })

  it('puts back in order the pieces that come out of order', async () => {
    const { adapter } = setup({
      events: [
        { object: 'delta', content: ' à tous', position: 1 },
        { object: 'delta', content: 'Bonjour', position: 0 },
        { object: 'done' }
      ]
    })

    const results = await run(adapter, [userMessage('Fix it')])

    // The second piece waits for the first one
    expect(results.map(getText)).toEqual([
      '',
      'Bonjour à tous',
      'Bonjour à tous'
    ])
  })

  it('gives what a reasoning model thinks apart from its answer', async () => {
    const { adapter } = setup({
      events: [
        { object: 'reasoning', content: ' = 391', position: 1 },
        { object: 'reasoning', content: '17 x 23', position: 0 },
        { object: 'delta', content: '391', position: 0 },
        { object: 'done' }
      ]
    })

    const results = await run(adapter, [userMessage('17 x 23?')])

    expect(results.map(result => result.content)).toEqual([
      [{ type: 'text', text: '' }],
      [
        { type: 'reasoning', text: '17 x 23 = 391' },
        { type: 'text', text: '' }
      ],
      [
        { type: 'reasoning', text: '17 x 23 = 391' },
        { type: 'text', text: '391' }
      ],
      [
        { type: 'reasoning', text: '17 x 23 = 391' },
        { type: 'text', text: '391' }
      ]
    ])
  })

  it('leaves out the answer to another message', async () => {
    const { adapter, events } = setup({
      events: [{ object: 'delta', content: 'Mine' }, { object: 'done' }]
    })
    events.push({ _id: 'other', object: 'delta', content: 'Not mine' })

    const results = await run(adapter, [userMessage('Fix it')])

    expect(getText(results.at(-1))).toBe('Mine')
  })

  it('holds back the start of a mark of the sources until it is whole', async () => {
    const { adapter } = setup({
      events: [
        { object: 'delta', content: 'Based on a.', position: 0 },
        { object: 'delta', content: ' [Sources:', position: 1 },
        { object: 'delta', content: ' 1,', position: 2 },
        { object: 'delta', content: ' 2]', position: 3 },
        { object: 'delta', content: ' See [REF]doc_1', position: 4 },
        { object: 'delta', content: '[/REF] too', position: 5 },
        { object: 'done' }
      ]
    })

    const results = await run(adapter, [userMessage('Fix it')])

    expect(results.map(getText)).toEqual([
      'Based on a.',
      'Based on a.',
      'Based on a.',
      'Based on a.',
      'Based on a. See',
      'Based on a. See too',
      'Based on a. See too'
    ])
  })

  it.each([
    ['[', 'Based on a.'],
    ['[Sources: 1, 2', 'Based on a.'],
    ['[Source 4, Source', 'Based on a.'],
    ['[Source 4, Sou', 'Based on a.'],
    ['[doc_1', 'Based on a.'],
    ['[REF]doc_1[/RE', 'Based on a.'],
    ['[REF]doc_1[/REF]', 'Based on a.'],
    ['[Sources: 1](doc_1.p', 'Based on a.'],
    ['REFdoc_1/RE', 'Based on a.'],
    ['An interval [0, 1', 'Based on a. An interval [0, 1'],
    ['See [the guide', 'Based on a. See [the guide'],
    ['A [x', 'Based on a. A [x']
  ])(
    'shows an answer still written that ends with %p as %p',
    async (end, shown) => {
      const { adapter } = setup({
        events: [
          { object: 'delta', content: 'Based on a.', position: 0 },
          { object: 'delta', content: ` ${end}`, position: 1 },
          { object: 'done' }
        ]
      })

      const results = await run(adapter, [userMessage('Fix it')])

      expect(getText(results[1])).toBe(shown)
    }
  )

  it('gives back what it held when the answer ends', async () => {
    const { adapter } = setup({
      events: [
        { object: 'delta', content: 'Based on a.', position: 0 },
        { object: 'delta', content: ' A [', position: 1 },
        { object: 'done' }
      ]
    })

    const results = await run(adapter, [userMessage('Fix it')])

    expect(results.map(getText)).toEqual([
      'Based on a.',
      'Based on a. A',
      'Based on a. A ['
    ])
  })

  it('tells when the stack refuses the message', async () => {
    const { adapter, fetchJSON } = setup({})
    fetchJSON.mockRejectedValue(new Error('Bad Request'))

    const results = await run(adapter, [userMessage('Fix it')])

    expect(results).toEqual([
      {
        content: [{ type: 'text', text: '' }],
        status: { type: 'incomplete', reason: 'error' },
        metadata: { custom: { isError: true } }
      }
    ])
  })

  it('tells when the answer fails, and keeps what came', async () => {
    const { adapter } = setup({
      events: [
        { object: 'delta', content: 'Bonjour' },
        { object: 'error', message: 'LLM error' }
      ]
    })

    const results = await run(adapter, [userMessage('Fix it')])

    expect(getText(results.at(-1))).toBe('Bonjour')
    expect(results.at(-1).metadata.custom).toEqual({ isError: true })
  })

  it('tells when the answer is empty', async () => {
    const { adapter } = setup({ events: [{ object: 'done' }] })

    const results = await run(adapter, [userMessage('Fix it')])

    expect(results.at(-1).metadata.custom).toEqual({ isEmpty: true })
  })

  it('sends the instructions of a request of the app', async () => {
    const { adapter, fetchJSON } = setup({
      events: [{ object: 'done' }],
      options: { instructions: 'Answer with the text only' }
    })

    await run(adapter, [userMessage('Tell a joke')], undefined, {
      custom: { instructions: 'Be funny' }
    })

    expect(fetchJSON.mock.calls[0][2]).toEqual({
      q: 'Tell a joke',
      documents: false,
      instructions: 'Be funny'
    })
  })

  it('offers the capabilities of the app to the LLM', async () => {
    const actions = [{ name: 'insert_slide', description: 'add a slide' }]
    const { adapter, fetchJSON } = setup({
      events: [{ object: 'done' }],
      options: { actions }
    })

    await run(adapter, [userMessage('Add a slide')])

    expect(fetchJSON.mock.calls[0][2]).toEqual({
      q: 'Add a slide',
      documents: false,
      actions
    })
  })

  it('gives the call the LLM proposes in place of an answer', async () => {
    const action = {
      name: 'insert_slide',
      params: { title: 'Risks', bullets: ['Delay'] }
    }
    const { adapter } = setup({
      events: [{ object: 'action', action }, { object: 'done' }],
      options: { actions: [{ name: 'insert_slide' }] }
    })

    const results = await run(adapter, [userMessage('Add a slide')])

    expect(getText(results.at(-1))).toBe('')
    expect(results.at(-1).status).toEqual({ type: 'complete', reason: 'stop' })
    expect(results.at(-1).metadata.custom).toEqual({ action })
  })

  it('gives the call the LLM proposes after an answer', async () => {
    const action = { name: 'insert_slide', params: { title: 'Risks' } }
    const { adapter } = setup({
      events: [
        { object: 'delta', content: 'Here are the risks', position: 0 },
        { object: 'action', action },
        { object: 'done' }
      ]
    })

    const results = await run(adapter, [userMessage('Add a slide')])

    expect(getText(results.at(-1))).toBe('Here are the risks')
    expect(results.at(-1).metadata.custom).toEqual({ action })
  })

  it('leaves the answer as it is when the user stops it', async () => {
    const controller = new AbortController()
    const { adapter, events, fetchJSON } = setup({
      events: [{ object: 'delta', content: 'Bonjour' }]
    })

    const running = run(adapter, [userMessage('Fix it')], controller.signal)
    await new Promise(resolve => setTimeout(resolve, 0))
    controller.abort()
    events.push({ _id: 'q1', object: 'delta', content: ' à tous' })
    const results = await running

    expect(results.map(getText)).toEqual(['Bonjour'])
    expect(results.at(-1).status).toBe(undefined)
    expect(fetchJSON).toHaveBeenLastCalledWith(
      'POST',
      '/ai/chat/conversations/c1/cancel'
    )
  })

  it('lets the answer go on when the user leaves the conversation', async () => {
    const controller = new AbortController()
    const { adapter, events, fetchJSON } = setup({
      events: [{ object: 'delta', content: 'Bonjour' }]
    })

    const running = run(adapter, [userMessage('Fix it')], controller.signal)
    await new Promise(resolve => setTimeout(resolve, 0))
    // assistant-ui detaches the run on unmount
    controller.abort(Object.assign(new Error('AbortError'), { detach: true }))
    events.push({ _id: 'q1', object: 'delta', content: ' à tous' })
    await running

    expect(fetchJSON).not.toHaveBeenCalledWith(
      'POST',
      '/ai/chat/conversations/c1/cancel'
    )
  })

  it('does nothing without a message of the user', async () => {
    const { adapter, fetchJSON } = setup({})

    expect(await run(adapter, [])).toEqual([])
    expect(fetchJSON).not.toHaveBeenCalled()
  })
})

describe('makeChat', () => {
  it('sends each message as the request of the moment says', async () => {
    const fetchJSON = jest.fn(async () => ({
      data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
    }))
    const chat = makeChat({
      client: { stackClient: { fetchJSON } },
      conversationId: 'c1'
    })
    const controller = new AbortController()
    const sendAndStop = async () => {
      const running = run(
        chat.adapter,
        [userMessage('Hello')],
        controller.signal
      )
      await new Promise(resolve => setTimeout(resolve, 0))
      controller.abort()
      await running
    }

    await sendAndStop()
    chat.setRequest({
      prepareQuery: text => `${text}!`,
      hasDocuments: true,
      instructions: 'Shout'
    })
    await sendAndStop()

    const messageCalls = fetchJSON.mock.calls.filter(
      ([, path]) => !path.endsWith('/cancel')
    )
    expect(messageCalls.map(call => call[2])).toEqual([
      { q: 'Hello', documents: false },
      { q: 'Hello!', instructions: 'Shout' }
    ])
  })

  it('joins a new text of the app to the next message, sent again or not', async () => {
    const chat = makeChat({
      client: {
        stackClient: {
          fetchJSON: jest.fn(async (method, path, body) => {
            chat.events.push({ _id: 'q1', object: 'done' })
            sent.push(body.q)
            return {
              data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
            }
          })
        }
      },
      conversationId: 'c1'
    })
    const sent = []
    chat.setRequest({
      prepareQuery: (text, { isFirstOnText }) =>
        isFirstOnText ? `${text} + the text` : text,
      hasDocuments: true,
      instructions: null
    })
    const first = [userMessage('Fix it'), assistantMessage('Fixed')]

    await run(chat.adapter, [userMessage('Fix it')])
    await run(chat.adapter, [...first, userMessage('Shorter')])
    chat.startNewText()
    await run(chat.adapter, [
      ...first,
      userMessage('Shorter'),
      assistantMessage('Short'),
      userMessage('Translate')
    ])
    // The same message, sent again
    await run(chat.adapter, [
      ...first,
      userMessage('Shorter'),
      assistantMessage('Short'),
      userMessage('Translate')
    ])

    expect(sent).toEqual([
      'Fix it + the text',
      'Shorter',
      'Translate + the text',
      'Translate + the text'
    ])
  })

  it('joins the text to the first message after a past conversation', async () => {
    const sent = []
    const chat = makeChat({
      client: {
        stackClient: {
          fetchJSON: jest.fn(async (method, path, body) => {
            chat.events.push({ _id: 'q1', object: 'done' })
            sent.push(body.q)
            return {
              data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
            }
          })
        }
      },
      conversationId: 'c1',
      textIndex: 1
    })
    chat.setRequest({
      prepareQuery: (text, { isFirstOnText }) =>
        isFirstOnText ? `${text} + the text` : text,
      hasDocuments: true,
      instructions: null
    })
    const past = [userMessage('Fix it'), assistantMessage('Fixed')]

    await run(chat.adapter, [...past, userMessage('Shorter')])

    expect(sent).toEqual(['Shorter + the text'])
  })

  it('gives its adapter the events it receives', async () => {
    const fetchJSON = jest.fn(async () => ({
      data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
    }))
    const chat = makeChat({
      client: { stackClient: { fetchJSON } },
      conversationId: 'c1'
    })
    fetchJSON.mockImplementation(async () => {
      chat.events.push({ _id: 'q1', object: 'delta', content: 'Hi' })
      chat.events.push({ _id: 'q1', object: 'done' })
      return {
        data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
      }
    })

    const results = await run(chat.adapter, [userMessage('Hello')])

    expect(getText(results.at(-1))).toBe('Hi')
  })
})

describe('removeSourceMarks', () => {
  it.each([
    ['The budget [REF]doc_1[/REF] is voted.', 'The budget is voted.'],
    ['The budget REFdoc_1/REF is voted.', 'The budget is voted.'],
    ['A REF.../REF B [REF]...[/REF] C REF.../REF D', 'A B C D'],
    ['The budget [doc_2] is voted.', 'The budget is voted.'],
    ['The budget is voted [Source 1, 3].', 'The budget is voted.'],
    ['The budget is voted [Sources: 1, 3]().', 'The budget is voted.'],
    ['The budget [Source 4, Source 6] is voted.', 'The budget is voted.'],
    ['A list:\n- [ ] to do\n- [x] done', 'A list:\n- [ ] to do\n- [x] done'],
    ['See [Sources] and [Source list]', 'See [Sources] and [Source list]'],
    ['REF not closed [REF]not closed', 'REF not closed [REF]not closed'],
    ['before refdoc_1/ref after', 'before refdoc_1/ref after'],
    ['PREFIX: see the page /REFUND', 'PREFIX: see the page /REFUND']
  ])('reads %p as %p', (text, expected) => {
    expect(removeSourceMarks(text)).toBe(expected)
  })
})
