import { render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { AnswerAnnouncer } from '@/components/Messages/AnswerAnnouncer'
import en from '@/locales/en.json'

let mockMessages = []
let props = {}

jest.mock('@assistant-ui/react', () => ({
  useThread: selector => selector({ messages: mockMessages })
}))

const question = { id: 'q1', role: 'user', content: [] }
const answer = (text, status, custom = {}) => ({
  id: 'a1',
  role: 'assistant',
  content: [{ type: 'text', text }],
  status,
  metadata: { custom }
})
const RUNNING = { type: 'running' }
const COMPLETE = { type: 'complete', reason: 'stop' }

function setup(...steps) {
  const renderStep = messages => {
    mockMessages = messages
    return (
      <I18n lang="en" polyglot={initTranslation('en', () => en)}>
        <AnswerAnnouncer {...props} />
      </I18n>
    )
  }
  const [first, ...next] = steps
  const { rerender } = render(renderStep(first))
  next.forEach(messages => rerender(renderStep(messages)))
}

describe('AnswerAnnouncer', () => {
  beforeEach(() => {
    props = {}
  })

  it('announces a complete answer once, in plain text', () => {
    setup(
      [question],
      [question, answer('**Bonjour**', RUNNING)],
      [question, answer('**Bonjour** à tous', COMPLETE)]
    )

    expect(screen.getByRole('status').textContent).toBe(
      'Twake AI answered: Bonjour à tous'
    )
  })

  it('announces nothing while the answer is written', () => {
    setup([question], [question, answer('Bonjour', RUNNING)])

    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('announces a stopped answer', () => {
    setup(
      [question, answer('Bon', RUNNING)],
      [question, answer('Bon', { type: 'incomplete', reason: 'cancelled' })]
    )

    expect(screen.getByRole('status').textContent).toBe('Answer stopped')
  })

  it('announces an empty answer', () => {
    setup(
      [question, answer('', RUNNING)],
      [question, answer('', COMPLETE, { isEmpty: true })]
    )

    expect(screen.getByRole('status').textContent).toBe(
      'No result received. Please try again.'
    )
  })

  it('announces the text of the insert blocks without their fences', () => {
    setup(
      [question, answer('', RUNNING)],
      [question, answer('Here:\n\n```insert\n**Hello**\n```', COMPLETE)]
    )

    expect(screen.getByRole('status').textContent).toBe(
      'Twake AI answered: Here: Hello'
    )
  })

  it('announces nothing for a call the view shows in place of a text', () => {
    props = { capabilities: [{ name: 'create' }] }
    setup(
      [question, answer('', RUNNING)],
      [question, answer('', COMPLETE, { action: { name: 'create' } })]
    )

    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('announces an empty answer for a call the view does not show', () => {
    setup(
      [question, answer('', RUNNING)],
      [question, answer('', COMPLETE, { action: { name: 'create' } })]
    )

    expect(screen.getByRole('status').textContent).toBe(
      'No result received. Please try again.'
    )
  })

  it('announces nothing on an error, which is an alert already', () => {
    setup(
      [question, answer('', RUNNING)],
      [
        question,
        answer('', { type: 'incomplete', reason: 'error' }, { isError: true })
      ]
    )

    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('announces nothing for the answers of a conversation opened', () => {
    setup([question, answer('Bonjour', COMPLETE)])

    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('clears the announcement for the next question', () => {
    setup(
      [question, answer('Bonjour', RUNNING)],
      [question, answer('Bonjour', COMPLETE)],
      [question, answer('Bonjour', COMPLETE), { ...question, id: 'q2' }]
    )

    expect(screen.getByRole('status').textContent).toBe('')
  })
})
