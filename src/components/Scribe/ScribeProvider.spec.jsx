import { render } from '@testing-library/react'
import React from 'react'

import { CozyProvider, createMockClient } from 'cozy-client'

import { ScribeProvider, useScribe } from '@/components/Scribe/ScribeProvider'

let mockAdapter = null

jest.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: ({ children }) => children,
  useLocalRuntime: adapter => {
    mockAdapter = adapter
    return {}
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
  const result = render(
    <CozyProvider client={client}>
      <ScribeProvider conversationId="c1" {...props}>
        <Probe onScribe={onScribe} />
      </ScribeProvider>
    </CozyProvider>
  )

  return {
    ...result,
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
  it('answers a message with the events of the realtime', async () => {
    const { client, emit } = setup({
      prepareQuery: (text, { isFirstMessage }) =>
        isFirstMessage ? `${text} <Bonjour>` : text,
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
