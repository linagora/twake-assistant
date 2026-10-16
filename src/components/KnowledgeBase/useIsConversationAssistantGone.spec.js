import { renderHook } from '@testing-library/react'

import { useQuery } from 'cozy-client'

import { useIsConversationAssistantGone } from './useIsConversationAssistantGone'

jest.mock('cozy-client', () => ({
  useQuery: jest.fn(),
  // queries.js computes its default fetch policy at import time.
  fetchPolicies: { olderThan: jest.fn(() => 'mock-fetch-policy') },
  Q: jest.fn(() => ({
    getById: jest.fn(() => ({ include: jest.fn(() => 'mock-definition') }))
  }))
}))

const conversation = assistantId => ({
  data: {
    _id: 'c1',
    ...(assistantId && {
      relationships: { assistant: { data: { _id: assistantId } } }
    })
  },
  fetchStatus: 'loaded'
})

function setup(conversationResult, assistantResult) {
  useQuery.mockImplementation((definition, options) =>
    options.as.startsWith('io.cozy.ai.chat.conversations')
      ? conversationResult
      : assistantResult
  )
  return renderHook(() => useIsConversationAssistantGone('c1')).result.current
}

describe('useIsConversationAssistantGone', () => {
  it.each([
    [
      'bound to no assistant',
      conversation(null),
      { fetchStatus: 'loaded' },
      false
    ],
    [
      'still loading its assistant',
      conversation('a1'),
      { fetchStatus: 'loading' },
      false
    ],
    [
      'bound to an assistant that exists',
      conversation('a1'),
      { data: { _id: 'a1' }, fetchStatus: 'loaded' },
      false
    ],
    [
      'bound to a deleted assistant',
      conversation('a1'),
      { data: null, fetchStatus: 'loaded' },
      true
    ],
    [
      'bound to an assistant that cannot be read for now',
      conversation('a1'),
      { fetchStatus: 'failed', lastError: { status: 503 } },
      false
    ]
  ])(
    'tells a conversation %s',
    (_, conversationResult, assistantResult, expected) => {
      expect(setup(conversationResult, assistantResult)).toBe(expected)
    }
  )
})
