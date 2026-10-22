import { act, render } from '@testing-library/react'
import React from 'react'

import { CozyProvider, createMockClient } from 'cozy-client'
import { initTranslation } from 'twake-i18n'

import { ScribeProvider, useScribe } from '@/components/Scribe/ScribeProvider'
import { makeScribePrepareQuery, makeScribePreparePrompt } from '@/lib/scribe'
import en from '@/locales/en.json'

let mockAdapter = null

let mockMessages = []

jest.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: ({ children }) => children,
  useLocalRuntime: adapter => {
    mockAdapter = adapter
    return { thread: { getState: () => ({ messages: mockMessages }) } }
  }
}))
jest.mock('cozy-minilog', () => () => ({ error: jest.fn() }))

function Probe({ onScribe }) {
  onScribe(useScribe())
  return null
}

function setup(props = {}) {
  const client = createMockClient({})
  const handlers = new Set()
  client.plugins = {
    realtime: {
      subscribe: jest.fn((event, doctype, handler) => handlers.add(handler)),
      unsubscribe: jest.fn((event, doctype, handler) =>
        handlers.delete(handler)
      )
    }
  }
  client.stackClient.fetchJSON = jest.fn(async () => ({
    data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
  }))
  const onScribe = jest.fn()
  const makeTree = treeProps => (
    <CozyProvider client={client}>
      <ScribeProvider conversationId="c1" {...treeProps}>
        <Probe onScribe={onScribe} />
      </ScribeProvider>
    </CozyProvider>
  )
  const result = render(makeTree(props))

  return {
    ...result,
    rerenderWith: nextProps => result.rerender(makeTree(nextProps)),
    client,
    emit: event => handlers.forEach(handler => handler(event)),
    getScribe: () => onScribe.mock.calls.at(-1)[0]
  }
}

async function run(messages, runConfig) {
  const results = []
  await act(async () => {
    for await (const result of mockAdapter.run({ messages, runConfig })) {
      results.push(result)
    }
  })
  return results
}

const userMessage = text => ({
  role: 'user',
  content: [{ type: 'text', text }]
})

// The answer of each message comes as soon as it is posted
function answerAtOnce({ client, emit }) {
  client.stackClient.fetchJSON.mockImplementation(async () => {
    emit({ _id: 'q1', object: 'done' })
    return {
      data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
    }
  })
}

const polyglot = initTranslation('en', () => en)
const scribePrepareQuery = makeScribePrepareQuery(
  'Bonjour',
  polyglot.t.bind(polyglot)
)

describe('ScribeProvider', () => {
  beforeEach(() => {
    mockMessages = []
  })

  it('joins a new text of the app to the next message, and offers its prompts again', async () => {
    const prepareQuery = (text, { isFirstOnText }) =>
      isFirstOnText ? `${text} <text>` : text
    const { client, emit, getScribe, rerenderWith } = setup({
      prepareQuery,
      text: 'Bonjour'
    })
    client.stackClient.fetchJSON.mockImplementation(async () => {
      emit({ _id: 'q1', object: 'done' })
      return {
        data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
      }
    })
    expect(getScribe().textStart).toBe(0)

    await run([userMessage('Fix it')])
    mockMessages = [userMessage('Fix it'), { role: 'assistant' }]
    rerenderWith({ prepareQuery, text: 'Au revoir' })
    await run([...mockMessages, userMessage('Translate')])

    expect(getScribe().textStart).toBe(1)
    expect(
      client.stackClient.fetchJSON.mock.calls.map(call => call[2].q)
    ).toEqual(['Fix it <text>', 'Translate <text>'])
  })

  it('answers a message with the events of the realtime', async () => {
    const { client, emit } = setup({
      prepareQuery: (text, { isFirstOnText }) =>
        isFirstOnText ? `${text} <Bonjour>` : text,
      instructions: 'Answer with the text only.'
    })
    client.stackClient.fetchJSON.mockImplementation(async () => {
      emit({ _id: 'q1', object: 'delta', content: 'Bonjour' })
      emit({ _id: 'q1', object: 'done' })
      return {
        data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
      }
    })

    const results = await run([userMessage('Fix it')])

    expect(client.stackClient.fetchJSON).toHaveBeenCalledWith(
      'POST',
      '/ai/chat/conversations/c1',
      {
        q: 'Fix it <Bonjour>',
        documents: false,
        instructions: 'Answer with the text only.'
      }
    )
    expect(results.at(-1).content[0].text).toBe('Bonjour')
  })

  it('sends the rules of the app with the instructions', async () => {
    const { client, emit } = setup({
      instructions: 'Answer with the text only.',
      rules: 'Write in French.'
    })
    client.stackClient.fetchJSON.mockImplementation(async () => {
      emit({ _id: 'q1', object: 'done' })
      return {
        data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
      }
    })

    await run([userMessage('Fix it')])

    expect(client.stackClient.fetchJSON.mock.calls[0][2].instructions).toBe(
      'Answer with the text only.\n\nWrite in French.'
    )
  })

  it('subscribes to the events of the chat, and stops with the scribe', () => {
    const { client, unmount } = setup()
    const { subscribe, unsubscribe } = client.plugins.realtime
    expect(subscribe).toHaveBeenCalledWith(
      'created',
      'io.cozy.ai.chat.events',
      expect.any(Function)
    )

    unmount()

    expect(unsubscribe).toHaveBeenCalledWith(
      'created',
      'io.cozy.ai.chat.events',
      subscribe.mock.calls[0][2]
    )
  })

  it('offers the capabilities of the app to the LLM, and gives them to the scribe', async () => {
    const action = { name: 'insert_slide', description: 'add a slide' }
    const capabilities = [
      { name: 'insert_slide', label: 'Insert', action, onClick: jest.fn() }
    ]
    const { client, emit, getScribe } = setup({ capabilities })
    client.stackClient.fetchJSON.mockImplementation(async () => {
      emit({ _id: 'q1', object: 'done' })
      return {
        data: { attributes: { messages: [{ id: 'q1', role: 'user' }] } }
      }
    })

    await run([userMessage('Add a slide')])

    expect(getScribe().capabilities).toBe(capabilities)
    expect(client.stackClient.fetchJSON.mock.calls[0][2].actions).toEqual([
      action
    ])
  })

  it('gives the scribe the prompts and the actions of the app', () => {
    const suggestions = [{ name: 'fix', label: 'Fix', prompt: 'Fix it.' }]
    const answerActions = [
      { name: 'insert', label: 'Insert', onClick: jest.fn() }
    ]
    const { getScribe } = setup({ suggestions, answerActions })

    expect(getScribe()).toMatchObject({
      suggestions,
      answerActions,
      hasDocuments: false
    })
  })

  it('checks the selection again when the app gives another text', () => {
    const { getScribe, rerenderWith } = setup({ text: 'Bonjour' })
    act(() => getScribe().setHasSelection(false))
    expect(getScribe().hasSelection).toBe(false)

    rerenderWith({ text: 'Au revoir' })

    expect(getScribe().hasSelection).toBe(true)
  })

  it('sends the document before the text when it is included', async () => {
    const requestDocument = jest.fn(async () => ({
      document: 'The whole note',
      isTruncated: false
    }))
    const scribe = setup({
      prepareQuery: scribePrepareQuery,
      text: 'Bonjour',
      requestDocument
    })
    answerAtOnce(scribe)
    act(() => scribe.getScribe().setHasDocument(true))

    await run([userMessage('Fix it')])

    expect(requestDocument).toHaveBeenCalledTimes(1)
    expect(scribe.client.stackClient.fetchJSON.mock.calls[0][2].q).toBe(
      '[Full document]\nThe whole note\n[End of full document]\n\nFix it\n\nText:\n"""\nBonjour\n"""'
    )
  })

  it('sends a fresh conversation for each request when the conversation is off', async () => {
    const scribe = setup({ prepareQuery: scribePrepareQuery, text: 'Bonjour' })
    answerAtOnce(scribe)
    act(() => scribe.getScribe().setHasConversation(false))

    await run([userMessage('Fix it')])
    mockMessages = [userMessage('Fix it'), { role: 'assistant' }]
    await run([...mockMessages, userMessage('Shorter')])

    const calls = scribe.client.stackClient.fetchJSON.mock.calls
    const paths = calls.map(call => call[1])
    expect(paths[0]).not.toBe(paths[1])
    expect(paths).not.toContain('/ai/chat/conversations/c1')
    // A fresh conversation does not hold the text
    expect(calls[1][2].q).toBe('Shorter\n\nText:\n"""\nBonjour\n"""')
  })

  it('sends the text without the selection when it is off', async () => {
    const scribe = setup({ prepareQuery: scribePrepareQuery, text: 'Bonjour' })
    answerAtOnce(scribe)
    act(() => scribe.getScribe().setHasSelection(false))

    await run([userMessage('Fix it')])

    expect(scribe.client.stackClient.fetchJSON.mock.calls[0][2].q).toBe(
      'Fix it'
    )
  })

  it('sends the selection with the next request once it is checked again', async () => {
    const scribe = setup({ prepareQuery: scribePrepareQuery, text: 'Bonjour' })
    answerAtOnce(scribe)
    act(() => scribe.getScribe().setHasSelection(false))

    await run([userMessage('Fix it')])
    act(() => scribe.getScribe().setHasSelection(true))
    mockMessages = [userMessage('Fix it'), { role: 'assistant' }]
    await run([...mockMessages, userMessage('Shorter')])

    expect(
      scribe.client.stackClient.fetchJSON.mock.calls.map(call => call[2].q)
    ).toEqual(['Fix it', 'Shorter\n\nText:\n"""\nBonjour\n"""'])
  })

  it('keeps the text sent with each request, whatever the app gives next', async () => {
    const scribe = setup({ prepareQuery: scribePrepareQuery, text: 'Bonjour' })
    answerAtOnce(scribe)
    expect(scribe.getScribe().sentTexts).toEqual({})
    act(() => scribe.getScribe().setHasSelection(false))

    await run([userMessage('Fix it')])
    expect(scribe.getScribe().sentTexts).toEqual({})
    act(() => scribe.getScribe().setHasSelection(true))
    mockMessages = [userMessage('Fix it'), { role: 'assistant' }]
    await run([...mockMessages, userMessage('Shorter')])
    scribe.rerenderWith({ prepareQuery: scribePrepareQuery, text: 'Au revoir' })

    expect(scribe.getScribe().sentTexts).toEqual({ 1: 'Bonjour' })
  })

  it('keeps the text of a suggestion as sent with its request', async () => {
    const scribe = setup({
      prepareQuery: scribePrepareQuery,
      preparePrompt: makeScribePreparePrompt('Bonjour'),
      text: 'Bonjour'
    })
    answerAtOnce(scribe)

    await run([userMessage('Summarize the text.')], {
      custom: { prompt: 'summarize' }
    })

    expect(scribe.getScribe().sentTexts).toEqual({ 0: 'Bonjour' })
  })

  it('sends a chip without the document even when it is included', async () => {
    const requestDocument = jest.fn(async () => ({
      document: 'The whole note',
      isTruncated: false
    }))
    const scribe = setup({
      prepareQuery: scribePrepareQuery,
      preparePrompt: name => ({ q: `${name}: Bonjour`, instructions: null }),
      text: 'Bonjour',
      requestDocument
    })
    answerAtOnce(scribe)
    act(() => scribe.getScribe().setHasDocument(true))

    const results = await run([userMessage('Summarize the text.')], {
      custom: { prompt: 'summarize' }
    })

    expect(requestDocument).not.toHaveBeenCalled()
    expect(scribe.client.stackClient.fetchJSON.mock.calls[0][2].q).toBe(
      'summarize: Bonjour'
    )
    expect(results.at(-1).metadata.custom.documentNotice).toBe(undefined)
  })
})
