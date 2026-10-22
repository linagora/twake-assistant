import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { createMockClient } from 'cozy-client'
import CozyTheme from 'cozy-ui-plus/dist/providers/CozyTheme'
import { initTranslation } from 'twake-i18n'

import { AssistantIntent } from '@/components/Intents/AssistantIntent'
import { ScribeView } from '@/components/Scribe/ScribeView'
import en from '@/locales/en.json'

const mockService = {
  getData: jest.fn(),
  getIntent: () => ({
    _id: 'intent-1',
    attributes: { client: 'https://notes.cozy.example' }
  }),
  terminate: jest.fn(),
  cancel: jest.fn(),
  sendResult: jest.fn(),
  resizeClient: jest.fn(),
  notifyReadyToUse: jest.fn(),
  onData: jest.fn(listener => {
    dataListeners.add(listener)
    return () => dataListeners.delete(listener)
  })
}
const dataListeners = new Set()
const mockSendData = data => dataListeners.forEach(listener => listener(data))
const mockCreateService = jest.fn()
const mockComposer = {
  text: '',
  getState: () => ({ text: mockComposer.text }),
  setText: text => {
    mockComposer.text = text
  }
}

jest.mock('cozy-interapp', () =>
  jest.fn().mockImplementation(() => ({
    createService: mockCreateService
  }))
)
jest.mock('@/components/Scribe/ScribeView', () => ({
  ScribeView: jest.fn(() => <div data-testid="scribe-view" />)
}))
// For the scribe itself, on a new conversation
jest.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: ({ children }) => children,
  useLocalRuntime: () => ({ thread: { getState: () => ({ messages: [] }) } }),
  ThreadPrimitive: {
    Root: ({ children }) => <div>{children}</div>,
    Messages: () => null
  },
  ComposerPrimitive: {
    Root: ({ children }) => <form>{children}</form>,
    Input: ({ placeholder }) => <textarea aria-label={placeholder} />
  },
  useThread: selector => selector({ messages: [], isRunning: false }),
  useThreadRuntime: () => ({}),
  useComposerRuntime: () => mockComposer
}))
jest.mock('cozy-client', () => ({
  ...jest.requireActual('cozy-client'),
  RealTimeQueries: () => null
}))
jest.mock('cozy-ui-plus/dist/providers/CozyTheme', () =>
  jest.fn(({ children }) => <div>{children}</div>)
)

// Not under a router nor providers: the intent has its own
function renderIntent() {
  const client = createMockClient({})
  client.plugins = {
    realtime: { subscribe: jest.fn(), unsubscribe: jest.fn() }
  }

  return render(
    <AssistantIntent
      client={client}
      lang="en"
      polyglot={initTranslation('en', () => en)}
      intentId="intent-1"
    />
  )
}

// The props the intent gives to the scribe
async function findScribeProps() {
  await waitFor(() => screen.getByTestId('scribe-view'))
  return ScribeView.mock.calls.at(-1)[0]
}

describe('AssistantIntent', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    mockCreateService.mockResolvedValue(mockService)
  })

  it('opens a scribe on the documents of the user without data', async () => {
    mockService.getData.mockReturnValue(null)
    renderIntent()

    const { text, documents, suggestions, answerActions, capabilities } =
      await findScribeProps()
    expect(text).toBe('')
    expect(documents).toBe(true)
    expect(suggestions.map(suggestion => suggestion.label)).toEqual([
      'Translate',
      'Correct',
      'Help me write'
    ])
    expect(answerActions).toEqual([])
    expect(capabilities).toEqual([])
    expect(mockCreateService).toHaveBeenCalledWith('intent-1', window)
  })

  it('opens a scribe with data it cannot read', async () => {
    mockService.getData.mockReturnValue({
      content: null,
      answerActions: null,
      theme: 'dark'
    })
    renderIntent()

    const { text, documents } = await findScribeProps()
    expect(text).toBe('')
    expect(documents).toBe(true)
  })

  it('opens a scribe on the text of the app', async () => {
    mockService.getData.mockReturnValue({ content: 'Bonjour' })
    renderIntent()

    const {
      suggestions,
      prepareQuery,
      preparePrompt,
      instructions,
      answerActions
    } = await findScribeProps()
    expect(suggestions.map(suggestion => suggestion.name)).toContain(
      'translate'
    )
    expect(preparePrompt('summarize').q).toContain('Bonjour')
    expect(prepareQuery('Fix', { isFirstOnText: true })).toContain('Bonjour')
    expect(instructions).toBe(en.scribe.instructions)
    expect(answerActions).toEqual([])
  })

  it('hands the rules of the app to the scribe', async () => {
    mockService.getData.mockReturnValue({ rules: 'Never write the price.' })
    renderIntent()

    const { rules } = await findScribeProps()
    expect(rules).toBe('Never write the price.')
  })

  it('works on the new text the app gives while it is open', async () => {
    mockService.getData.mockReturnValue({
      content: 'Bonjour',
      answerActions: [{ name: 'insert' }]
    })
    renderIntent()
    await findScribeProps()

    act(() =>
      mockSendData({
        content: 'Au revoir',
        answerActions: [{ name: 'insert' }, { name: 'replace' }]
      })
    )

    const { text, prepareQuery, answerActions } = await findScribeProps()
    expect(text).toBe('Au revoir')
    expect(prepareQuery('Fix', { isFirstOnText: true })).toContain('Au revoir')
    expect(answerActions.map(action => action.name)).toEqual([
      'insert',
      'replace'
    ])
  })

  it('asks the app for its document, and reads it in the next data', async () => {
    mockService.getData.mockReturnValue({ content: 'Bonjour' })
    renderIntent()
    const { requestDocument } = await findScribeProps()

    const request = requestDocument()
    expect(mockService.sendResult).toHaveBeenCalledWith({ request: 'document' })
    act(() =>
      mockSendData({
        content: 'Bonjour',
        document: 'Bonjour à tous',
        documentTruncated: true
      })
    )

    await expect(request).resolves.toEqual({
      document: 'Bonjour à tous',
      isTruncated: true
    })
    expect((await findScribeProps()).text).toBe('Bonjour')
  })

  it('keeps the theme of the opening when the app gives new data', async () => {
    mockService.getData.mockReturnValue({
      content: 'Bonjour',
      theme: { type: 'dark' }
    })
    renderIntent()
    await findScribeProps()

    act(() => mockSendData({ content: 'Au revoir', theme: { type: 'light' } }))

    await findScribeProps()
    expect(CozyTheme.mock.calls.at(-1)[0].type).toBe('dark')
  })

  it('opens a scribe with the actions of the app, without a text', async () => {
    mockService.getData.mockReturnValue({
      answerActions: [{ name: 'insert', label: 'Add to the note' }]
    })
    renderIntent()

    const {
      suggestions,
      prepareQuery,
      instructions,
      documents,
      answerActions
    } = await findScribeProps()
    expect(suggestions.map(suggestion => suggestion.name)).toEqual([
      'translate',
      'correct',
      'write'
    ])
    expect(prepareQuery('Fix', { isFirstOnText: true })).toBe('Fix')
    expect(
      prepareQuery('Fix', { isFirstOnText: true, document: 'The note' })
    ).toBe('[Full document]\nThe note\n[End of full document]\n\nFix')
    expect(instructions).toBe(undefined)
    expect(documents).toBe(true)
    expect(answerActions.map(action => action.label)).toEqual([
      'Add to the note'
    ])
  })

  it('cancels the intent when the user closes the scribe', async () => {
    mockService.getData.mockReturnValue({ content: 'Bonjour' })
    renderIntent()

    const { onClose } = await findScribeProps()
    onClose()

    expect(mockService.cancel).toHaveBeenCalled()
  })

  describe('in the compact layout', () => {
    beforeEach(() => {
      mockComposer.text = ''
      global.ResizeObserver = class {
        observe() {}
        disconnect() {}
      }
      ScribeView.mockImplementation(
        jest.requireActual('@/components/Scribe/ScribeView').ScribeView
      )
    })
    afterEach(() => {
      ScribeView.mockImplementation(() => <div data-testid="scribe-view" />)
    })

    it('hands a panel request to the app with the draft and the conversation', async () => {
      mockService.getData.mockReturnValue({ layout: 'compact', draft: 'Hi' })
      renderIntent()

      fireEvent.click(
        await screen.findByRole('button', { name: 'Scribe panel' })
      )

      expect(mockService.sendResult).toHaveBeenCalledWith({
        request: 'panel',
        draft: 'Hi',
        conversation: expect.any(String)
      })
      expect(mockService.cancel).not.toHaveBeenCalled()
    })
  })

  it('asks the app to resize the frame of the compact layout only', async () => {
    mockService.getData.mockReturnValue({
      layout: 'compact',
      draft: 'Hi',
      conversation: 'c1'
    })
    renderIntent()

    const { layout, draft, conversation, onResize } = await findScribeProps()
    expect({ layout, draft, conversation }).toEqual({
      layout: 'compact',
      draft: 'Hi',
      conversation: 'c1'
    })
    onResize({ height: 240 })
    expect(mockService.resizeClient).toHaveBeenCalledWith({ height: 240 })

    act(() => mockSendData({ layout: 'panel' }))

    expect((await findScribeProps()).onResize).toBe(null)
  })

  it('hands the answer and the action clicked to the app', async () => {
    mockService.getData.mockReturnValue({
      answerActions: [{ name: 'insert' }, { name: 'replace' }]
    })
    renderIntent()

    const { answerActions } = await findScribeProps()
    answerActions[1].onClick('Hello')

    expect(mockService.sendResult).toHaveBeenCalledWith({
      answerAction: 'replace',
      text: 'Hello',
      format: 'markdown'
    })
    expect(mockService.terminate).not.toHaveBeenCalled()
    expect(mockService.cancel).not.toHaveBeenCalled()
  })

  it('offers the suggestions of the app, and gives the router their requests', async () => {
    mockService.getData.mockReturnValue({
      content: 'Bonjour',
      capabilities: [
        {
          name: 'insert_slide',
          description: 'add a slide',
          parameters: {
            type: 'object',
            properties: { title: { type: 'string' } }
          },
          confirm: false
        }
      ],
      suggestions: [
        { name: 'catalogue' },
        {
          name: 'new_slide',
          capability: 'insert_slide',
          label: 'New slide',
          message: 'Add a slide after this one'
        }
      ]
    })
    renderIntent()

    const { suggestions, capabilities, documents } = await findScribeProps()
    expect(suggestions.at(-1)).toEqual({
      name: 'new_slide',
      label: 'New slide',
      request: 'Add a slide after this one'
    })
    expect(suggestions.map(suggestion => suggestion.name)).toContain('correct')
    expect(capabilities[0].confirm).toBe(false)
    expect(capabilities[0].action.examples).toEqual([
      'Add a slide after this one'
    ])
    expect(documents).toBe(false)
  })

  it('opens a scribe on the suggestions of the app alone', async () => {
    mockService.getData.mockReturnValue({
      suggestions: [{ name: 'joke', message: 'Tell a joke', label: 'Joke' }],
      documents: false
    })
    renderIntent()

    const { suggestions, documents } = await findScribeProps()
    expect(suggestions).toEqual([
      { name: 'joke', label: 'Joke', request: 'Tell a joke' }
    ])
    expect(documents).toBe(false)
  })

  it('hands the call of a capability the user confirms to the app', async () => {
    const insertSlide = {
      name: 'insert_slide',
      label: 'Insert the slide',
      description: 'add a slide',
      parameters: { type: 'object', properties: { title: { type: 'string' } } }
    }
    mockService.getData.mockReturnValue({ capabilities: [insertSlide] })
    renderIntent()

    const { capabilities } = await findScribeProps()
    expect(capabilities.map(capability => capability.action)).toEqual([
      {
        name: 'insert_slide',
        description: 'add a slide',
        parameters: {
          type: 'object',
          properties: { title: { type: 'string' } }
        }
      }
    ])
    capabilities[0].onClick({ title: 'Risks', bullets: [] })

    expect(mockService.sendResult).toHaveBeenCalledWith({
      capability: 'insert_slide',
      params: { title: 'Risks', bullets: [] }
    })
    expect(mockService.terminate).not.toHaveBeenCalled()
  })

  it('takes the theme the app asks for', async () => {
    mockService.getData.mockReturnValue({ theme: { type: 'dark' } })
    renderIntent()

    await findScribeProps()
    expect(CozyTheme.mock.calls.at(-1)[0]).toMatchObject({
      type: 'dark',
      ignoreCozySettings: true
    })
  })

  it('follows the theme of the instance without one', async () => {
    mockService.getData.mockReturnValue(null)
    renderIntent()

    await findScribeProps()
    expect(CozyTheme.mock.calls.at(-1)[0]).toMatchObject({
      type: null,
      ignoreCozySettings: false
    })
  })

  it('shows nothing before it knows the data of the intent', () => {
    mockCreateService.mockReturnValue(new Promise(() => {}))
    const { container } = renderIntent()

    expect(container).toBeEmptyDOMElement()
  })

  it('tells the app once when the assistant is ready to use', async () => {
    mockService.getData.mockReturnValue({ content: 'Bonjour' })
    const { rerender } = renderIntent()

    await findScribeProps()
    rerender(
      <AssistantIntent
        client={createMockClient({})}
        lang="en"
        polyglot={initTranslation('en', () => en)}
        intentId="intent-1"
      />
    )
    await findScribeProps()
    expect(mockService.notifyReadyToUse).toHaveBeenCalledTimes(1)
  })

  it('tells when the intent cannot start', async () => {
    mockCreateService.mockRejectedValue(new Error('No intent'))
    renderIntent()

    await waitFor(() => screen.getByRole('alert'))
    expect(screen.queryByTestId('scribe-view')).toBe(null)
  })
})
