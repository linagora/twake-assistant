import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult
} from '@assistant-ui/react'

import Minilog from 'cozy-minilog'

import { StreamBridge } from './StreamBridge'
import { DEFAULT_ASSISTANT } from '../constants'
import { sanitizeChatContent, formatAnswer } from '../helpers'

const log = Minilog('🔍 [CozyRealtimeChatAdapter]')

type CozyClient = {
  stackClient: {
    fetchJSON: (method: string, path: string, body?: object) => Promise<unknown>
  }
}

export interface CozyRealtimeChatAdapterOptions {
  client: CozyClient
  conversationId: string
  assistantId?: string
  websearchEnabled?: boolean
}

/** The last user message: on a reload, assistant messages may follow it. */
const findUserQuery = (
  messages: ChatModelRunOptions['messages']
): string | null => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'user') {
      const textContent = msg.content.find(part => part.type === 'text')
      if (textContent && textContent.type === 'text') {
        return textContent.text
      }
    }
  }
  return null
}

/**
 * POSTs the query to /ai/chat/conversations/:id, then yields the answer as
 * its chunks arrive over the realtime, through the StreamBridge.
 */
export const createCozyRealtimeChatAdapter = (
  options: CozyRealtimeChatAdapterOptions,
  t: (key: string, options?: Record<string, unknown>) => string,
  streamBridgeRef: { current: StreamBridge }
): ChatModelAdapter => ({
  async *run({
    messages,
    abortSignal
  }: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult> {
    const { client, conversationId, assistantId, websearchEnabled } = options
    const streamBridge = streamBridgeRef.current

    const userQuery = findUserQuery(messages)
    if (!userQuery) {
      log.error('No user message found in:', messages)
      return
    }

    const stream = streamBridge.createStream(conversationId)

    if (abortSignal?.aborted) {
      streamBridge.cleanup(conversationId)
      return
    }

    try {
      yield {
        content: [{ type: 'text', text: '' }],
        status: { type: 'requires-action', reason: 'tool-calls' }
      }
      // On a reload, the same query is sent again to regenerate the answer
      await client.stackClient.fetchJSON(
        'POST',
        `/ai/chat/conversations/${conversationId}`,
        {
          q: userQuery,
          // The default assistant is a client-side sentinel with no CouchDB
          // document behind it: sending its id would make the stack store a
          // dangling relationship and fail rag-query on assistant resolution.
          ...(assistantId &&
            assistantId !== DEFAULT_ASSISTANT._id && {
              assistantID: assistantId
            }),
          ...(websearchEnabled && { websearch: true })
        }
      )

      let fullText = ''
      let wasAborted = false

      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          wasAborted = true
          break
        }

        fullText += chunk
        const sanitizedText = sanitizeChatContent(fullText)

        yield {
          content: [{ type: 'text', text: sanitizedText }],
          status: { type: 'running' }
        }
      }

      // abortSignal is re-checked here (not just wasAborted) to cover
      // cancellation before the first chunk: the loop above then exits
      // via a normal 'done' with zero iterations, never setting wasAborted
      if (!wasAborted && !abortSignal?.aborted) {
        const sources = streamBridge.getSources(conversationId)
        yield {
          content: [
            {
              type: 'text',
              text: formatAnswer({ role: 'assistant', content: fullText }, t)
            }
          ],
          status: { type: 'complete', reason: 'stop' },
          ...(sources ? { metadata: { custom: { sources } } } : {})
        }
      }
      streamBridge.cleanup(conversationId)
    } catch (error) {
      log.error('Error:', error)
      streamBridge.cleanup(conversationId)

      yield {
        content: [{ type: 'text', text: t('assistant.default_error') }],
        status: { type: 'incomplete', reason: 'error' },
        metadata: { custom: { isError: true } }
      }
    }
  }
})
