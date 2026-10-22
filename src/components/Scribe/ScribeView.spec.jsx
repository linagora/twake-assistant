import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { CozyProvider, createMockClient } from 'cozy-client'
import Minilog from 'cozy-minilog'
import { I18n, initTranslation } from 'twake-i18n'

import { ScribeView } from '@/components/Scribe/ScribeView'
import { DOCTYPE_AI_CHAT_CONVERSATIONS } from '@/doctypes'
import en from '@/locales/en.json'
import { buildConversationByIdQuery } from '@/queries'

let mockThread = { messages: [], isRunning: false }
const mockComposer = {
  text: '',
  getState: () => ({ text: mockComposer.text }),
  setText: jest.fn(text => {
    mockComposer.text = text
  }),
  send: jest.fn(),
  cancel: jest.fn()
}
let mockObserveSize = null

// The thread of assistant-ui, on the messages given to the runtime
jest.mock('@assistant-ui/react', () => {
  const { createContext, useContext } = jest.requireActual('react')
  const MessageContext = createContext(null)
  const toThreadMessage = (message, index, messages) => ({
    ...message,
    content:
      typeof message.content === 'string'
        ? [{ type: 'text', text: message.content }]
        : message.content,
    status: { type: 'complete' },
    metadata: message.metadata ?? {},
    isLast: index === messages.length - 1
  })

  return {
    AssistantRuntimeProvider: ({ children }) => children,
    useLocalRuntime: (adapter, { initialMessages }) => {
      mockThread = {
        messages: initialMessages.map(toThreadMessage),
        isRunning: false
      }
      return { thread: { getState: () => mockThread } }
    },
    ThreadPrimitive: {
      Root: ({ children, className }) => (
        <div className={className}>{children}</div>
      ),
      Viewport: ({ children, className }) => (
        <div className={className}>{children}</div>
      ),
      Messages: ({ components }) =>
        mockThread.messages.map(message => {
          const Message =
            message.role === 'user'
              ? components.UserMessage
              : components.AssistantMessage
          return (
            <MessageContext.Provider key={message.id} value={message}>
              <Message />
            </MessageContext.Provider>
          )
        })
    },
    MessagePrimitive: {
      Root: ({ children, className }) => (
        <div className={className}>{children}</div>
      ),
      Parts: ({ components: { Text } }) =>
        useContext(MessageContext).content.map((part, index) => (
          <Text key={index} text={part.text} />
        ))
    },
    ComposerPrimitive: {
      Root: ({ children, className }) => (
        <form className={className}>{children}</form>
      ),
      Input: ({ placeholder, onKeyDown }) => (
        <textarea aria-label={placeholder} onKeyDown={onKeyDown} />
      )
    },
    useThread: selector => selector(mockThread),
    useThreadRuntime: () => ({ append: jest.fn(), getState: () => mockThread }),
    useMessage: selector => selector(useContext(MessageContext)),
    useMessageRuntime: () => ({}),
    useComposerRuntime: () => mockComposer
  }
})
jest.mock('cozy-client', () => ({
  ...jest.requireActual('cozy-client'),
  RealTimeQueries: () => null
}))
jest.mock('cozy-minilog', () => {
  const log = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
  return () => log
})

const pastConversation = {
  _id: 'c1',
  messages: [
    { id: 'q1', role: 'user', content: 'Fix the first text' },
    { id: 'a1', role: 'assistant', content: 'The first text, fixed' },
    { id: 'q2', role: 'user', content: 'Translate the second text' }
  ]
}

function makeClient({ conversation, queryError } = {}) {
  const query = buildConversationByIdQuery('c1')
  const client = createMockClient({
    queries: {
      [query.options.as]: {
        doctype: DOCTYPE_AI_CHAT_CONVERSATIONS,
        definition: query.definition(),
        ...(conversation ? { data: [conversation] } : { queryError })
      }
    }
  })
  client.plugins = {
    realtime: { subscribe: jest.fn(), unsubscribe: jest.fn() }
  }
  // As cozy-client does when the query fails: its state, then its onError
  if (queryError) {
    client.query = jest.fn(async (definition, options) =>
      options.onError(queryError)
    )
  }
  return client
}

function makeError(status) {
  return Object.assign(new Error(`Error ${status}`), { status })
}

function renderScribe(props = {}, client = makeClient()) {
  return render(
    <CozyProvider client={client}>
      <I18n lang="en" polyglot={initTranslation('en', () => en)}>
        <ScribeView {...props} />
      </I18n>
    </CozyProvider>
  )
}

describe('ScribeView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
    mockComposer.text = ''
    global.ResizeObserver = class {
      constructor(callback) {
        mockObserveSize = callback
      }
      observe() {}
      disconnect() {}
    }
  })

  it('hides the header, the welcome and the disclaimer in the compact layout', () => {
    const { unmount } = renderScribe({ text: 'A text', onClose: jest.fn() })
    expect(
      screen.queryByRole('heading', { name: en.scribe.title })
    ).toBeInTheDocument()
    expect(screen.queryByText(en.scribe.welcome)).toBeInTheDocument()
    expect(screen.queryByText(en.assistant.disclaimer)).toBeInTheDocument()
    unmount()

    renderScribe({ layout: 'compact', onClose: jest.fn() })

    expect(screen.queryByRole('heading', { name: en.scribe.title })).toBe(null)
    expect(screen.queryByRole('button', { name: en.scribe.close })).toBe(null)
    expect(screen.queryByText(en.scribe.welcome)).toBe(null)
    expect(screen.queryByText(en.assistant.disclaimer)).toBe(null)
    expect(
      screen.queryByRole('textbox', { name: en.scribe.placeholder })
    ).toBeInTheDocument()
  })

  it('shows the panel row before the composer in the compact layout', () => {
    const onPanelRequest = jest.fn()
    renderScribe({
      layout: 'compact',
      suggestions: [{ name: 'fix', label: 'Fix', request: 'Fix the text.' }],
      onPanelRequest
    })
    const chip = screen.getByRole('button', { name: 'Fix' })
    const row = screen.getByRole('button', { name: 'Scribe panel' })
    const composer = screen.getByRole('textbox', {
      name: en.scribe.placeholder
    })

    expect(chip.compareDocumentPosition(row)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(row.compareDocumentPosition(composer)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    mockComposer.text = 'Hi'
    fireEvent.click(row)

    expect(onPanelRequest).toHaveBeenCalledWith('Hi', expect.any(String))
  })

  it.each(['panel', 'compact'])(
    'shows what to include above the composer in the %s layout',
    layout => {
      renderScribe({ layout, text: 'Bonjour' })
      const zone = screen.getByRole('group', { name: 'Include' })
      const composer = screen.getByRole('textbox', {
        name: en.scribe.placeholder
      })

      expect(zone.compareDocumentPosition(composer)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    }
  )

  it('shows only the latest exchange in the compact layout', async () => {
    const onPanelRequest = jest.fn()
    renderScribe(
      { layout: 'compact', conversation: 'c1', onPanelRequest },
      makeClient({ conversation: pastConversation })
    )

    expect(
      await screen.findByText('Translate the second text')
    ).toBeInTheDocument()
    expect(screen.queryByText('Fix the first text')).toBe(null)
    fireEvent.click(screen.getByRole('button', { name: 'Scribe panel' }))
    expect(onPanelRequest).toHaveBeenCalledWith('', 'c1')
  })

  it('opens the conversation the app hands over', async () => {
    renderScribe(
      { conversation: 'c1' },
      makeClient({ conversation: pastConversation })
    )

    expect(await screen.findByText('Fix the first text')).toBeInTheDocument()
    expect(screen.queryByText('Translate the second text')).toBeInTheDocument()
  })

  it('goes on with a conversation the stack does not have yet', async () => {
    const onPanelRequest = jest.fn()
    renderScribe(
      { layout: 'compact', conversation: 'c1', onPanelRequest },
      makeClient({ queryError: makeError(404) })
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Scribe panel' }))

    expect(onPanelRequest).toHaveBeenCalledWith('', 'c1')
    expect(Minilog().error).not.toHaveBeenCalled()
  })

  it('starts a new conversation when the one handed over cannot be loaded', async () => {
    const onPanelRequest = jest.fn()
    const error = makeError(403)
    renderScribe(
      { layout: 'compact', conversation: 'c1', onPanelRequest },
      makeClient({ queryError: error })
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Scribe panel' }))

    expect(onPanelRequest).toHaveBeenCalledTimes(1)
    expect(onPanelRequest.mock.calls[0][1]).not.toBe('c1')
    expect(Minilog().error).toHaveBeenCalledWith(
      expect.stringContaining('c1'),
      error
    )
  })

  it('seeds the composer with the draft', () => {
    renderScribe({ draft: 'Hi' })

    expect(mockComposer.setText).toHaveBeenCalledWith('Hi')
    fireEvent.click(screen.getByRole('button', { name: en.scribe.new }))
    expect(mockComposer.setText).toHaveBeenCalledTimes(1)
  })

  it('tells the height of the compact layout when it changes', () => {
    jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(240)
    const onResize = jest.fn()
    renderScribe({ layout: 'compact', onResize })

    act(() => mockObserveSize())

    expect(onResize).toHaveBeenCalledWith({ height: 240 })
  })
})
