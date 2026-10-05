import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { createMockClient } from 'cozy-client'
import { AssistantView } from 'cozy-search'
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
  notifyReadyToUse: jest.fn()
}
const mockCreateService = jest.fn()

jest.mock('cozy-interapp', () =>
  jest.fn().mockImplementation(() => ({
    createService: mockCreateService
  }))
)
jest.mock('cozy-search', () => ({
  AssistantView: jest.fn(() => <div data-testid="assistant-view" />)
}))
jest.mock('@/components/Scribe/ScribeView', () => ({
  ScribeView: jest.fn(() => <div data-testid="scribe-view" />)
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
  return render(
    <AssistantIntent
      client={createMockClient({})}
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

  it('opens the assistant as it is without data', async () => {
    mockService.getData.mockReturnValue(null)
    renderIntent()

    await waitFor(() => screen.getByTestId('assistant-view'))
    expect(AssistantView.mock.calls.at(-1)[0]).toEqual({})
    expect(screen.queryByTestId('scribe-view')).toBe(null)
    expect(mockCreateService).toHaveBeenCalledWith('intent-1', window)
  })

  it('opens the assistant as it is with data it cannot read', async () => {
    mockService.getData.mockReturnValue({
      content: null,
      answerActions: null,
      theme: 'dark'
    })
    renderIntent()

    await waitFor(() => screen.getByTestId('assistant-view'))
    expect(screen.queryByTestId('scribe-view')).toBe(null)
  })

  it('opens a scribe on the text of the app', async () => {
    mockService.getData.mockReturnValue({ content: 'Bonjour' })
    renderIntent()

    const { suggestions, prepareQuery, instructions, answerActions } =
      await findScribeProps()
    expect(suggestions.map(suggestion => suggestion.name)).toContain(
      'translate'
    )
    expect(prepareQuery('Fix', { isFirstMessage: true })).toContain('Bonjour')
    expect(instructions).toBe(en.scribe.instructions)
    expect(answerActions).toEqual([])
    expect(screen.queryByTestId('assistant-view')).toBe(null)
  })

  it('opens a scribe with the actions of the app, without a text', async () => {
    mockService.getData.mockReturnValue({
      answerActions: [{ name: 'insert', label: 'Add to the note' }]
    })
    renderIntent()

    const { suggestions, prepareQuery, answerActions } = await findScribeProps()
    expect(suggestions).toBe(undefined)
    expect(prepareQuery).toBe(undefined)
    expect(answerActions.map(action => action.label)).toEqual([
      'Add to the note'
    ])
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

  it('takes the theme the app asks for', async () => {
    mockService.getData.mockReturnValue({ theme: { type: 'dark' } })
    renderIntent()

    await waitFor(() => screen.getByTestId('assistant-view'))
    expect(CozyTheme.mock.calls.at(-1)[0]).toMatchObject({
      type: 'dark',
      ignoreCozySettings: true
    })
  })

  it('follows the theme of the instance without one', async () => {
    mockService.getData.mockReturnValue(null)
    renderIntent()

    await waitFor(() => screen.getByTestId('assistant-view'))
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
    expect(screen.queryByTestId('assistant-view')).toBe(null)
    expect(screen.queryByTestId('scribe-view')).toBe(null)
  })
})
