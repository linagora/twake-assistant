import { render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeRequest } from '@/components/Scribe/ScribeRequest'
import en from '@/locales/en.json'

let mockMessage = null
let mockThread = { messages: [] }

jest.mock('@assistant-ui/react', () => ({
  MessagePrimitive: {
    Root: ({ children, className }) => (
      <div className={className}>{children}</div>
    ),
    Parts: ({ components: { Text } }) => (
      <Text text={mockMessage.content[0].text} />
    )
  },
  useMessage: selector => selector(mockMessage),
  useThread: selector => selector(mockThread)
}))
jest.mock('@/components/Scribe/ScribeProvider', () => ({
  useScribe: jest.fn()
}))

const request = (id, text, custom) => ({
  id,
  role: 'user',
  content: [{ type: 'text', text }],
  metadata: { custom: custom ?? {} }
})
const answer = id => ({ id, role: 'assistant', content: [] })

function renderRequest(message, messages, scribe) {
  mockMessage = message
  mockThread = { messages }
  useScribe.mockReturnValue({
    layout: 'panel',
    sentTexts: {},
    ...scribe
  })

  return render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <ScribeRequest />
    </I18n>
  )
}

describe('ScribeRequest', () => {
  it('quotes the text sent with the request', () => {
    const first = request('q1', 'Fix it')
    renderRequest(first, [first], { sentTexts: { 0: 'Bonjour le monde' } })

    const quote = screen.getByText('Bonjour le monde')
    expect(quote).toBeInTheDocument()
    expect(quote.compareDocumentPosition(screen.getByText('Fix it'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('quotes a table of the text as a table', () => {
    const first = request('q1', 'Translate')
    renderRequest(first, [first], {
      sentTexts: {
        0: '<table>\n  <tr>\n   <td>\n\n**Ventes**\n\n</td>\n  </tr>\n</table>'
      }
    })

    expect(screen.getByRole('table')).toHaveTextContent('Ventes')
    expect(screen.queryByText(/<table>/)).toBe(null)
  })

  it('quotes the text on the request that sent it, not on the first of the conversation', () => {
    const messages = [
      request('q1', 'Fix it'),
      answer('a1'),
      request('q2', 'Shorter')
    ]
    renderRequest(messages[2], messages, {
      sentTexts: { 1: 'Bonjour le monde' }
    })

    expect(screen.queryByText('Bonjour le monde')).toBeInTheDocument()
  })

  it('shows a request that did not send the text without the quote', () => {
    const messages = [
      request('q1', 'Fix it'),
      answer('a1'),
      request('q2', 'Shorter')
    ]
    renderRequest(messages[0], messages, {
      text: 'Bonjour le monde',
      sentTexts: { 1: 'Bonjour le monde' }
    })

    expect(screen.queryByText('Fix it')).toBeInTheDocument()
    expect(screen.queryByTestId('scribe-quote')).toBe(null)
  })

  it('keeps the quote of a request when the app gives another text', () => {
    const first = request('q1', 'Fix it')
    renderRequest(first, [first], {
      text: 'Au revoir',
      sentTexts: { 0: 'Bonjour le monde' }
    })

    expect(screen.queryByText('Bonjour le monde')).toBeInTheDocument()
    expect(screen.queryByText('Au revoir')).toBe(null)
  })

  it('quotes the selection of a past request', () => {
    const messages = [
      request('q1', 'Fix it', { selection: 'Hello there' }),
      answer('a1'),
      request('q2', 'Shorter')
    ]
    renderRequest(messages[0], messages, {
      sentTexts: { 0: 'Bonjour le monde' }
    })

    expect(screen.queryByText('Hello there')).toBeInTheDocument()
    expect(screen.queryByText('Bonjour le monde')).toBe(null)
  })

  it('shows nothing outside the latest exchange in the compact layout', () => {
    const messages = [
      request('q1', 'Fix it', { selection: 'Hello there' }),
      answer('a1'),
      request('q2', 'Shorter'),
      answer('a2')
    ]
    const { container } = renderRequest(messages[0], messages, {
      layout: 'compact'
    })

    expect(container).toBeEmptyDOMElement()
  })
})
