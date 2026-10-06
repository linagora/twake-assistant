import { render } from '@testing-library/react'
import React from 'react'

import { CozyProvider, createMockClient } from 'cozy-client'

import { ScribeProvider, useScribe } from '@/components/Scribe/ScribeProvider'

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

async function run(messages) {
  const results = []
  for await (const result of mockAdapter.run({ messages })) {
    results.push(result)
  }
  return results
}

const userMessage = text => ({
  role: 'user',
  content: [{ type: 'text', text }]
})

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
})
