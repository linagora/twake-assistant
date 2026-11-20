import { useThread } from '@assistant-ui/react'
import React, { useEffect, useRef, useState } from 'react'

import { useI18n } from 'twake-i18n'

import { getText } from '@/components/Messages/Answer'
import { toPlainText } from '@/lib/chat'

function getAnnouncement(message, t) {
  const { status, metadata } = message
  // An error is an alert already
  if (status?.type === 'incomplete') {
    return status.reason === 'cancelled' ? t('chat.announce.stopped') : ''
  }
  const text = toPlainText(getText(message))
  // The call of an app shows in place of a text
  if (text === '') {
    return metadata?.custom?.action ? '' : t('chat.errors.empty_response')
  }
  return t('chat.announce.complete', { text })
}

/**
 * Tells screen readers once that the answer of the thread is done, stopped
 * or empty: the streamed text itself is not live, or it would be read word
 * by word
 */
export function AnswerAnnouncer() {
  const { t } = useI18n()
  const last = useThread(state => state.messages.at(-1))
  const [announcement, setAnnouncement] = useState('')
  const previousRef = useRef({ id: last?.id, status: last?.status?.type })

  useEffect(() => {
    const status = last?.status?.type
    const previous = previousRef.current
    previousRef.current = { id: last?.id, status }
    // Cleared for a new question, so that the same text is announced again
    if (last?.role === 'user' || status === 'running') {
      setAnnouncement('')
    } else if (previous.status === 'running' && previous.id === last?.id) {
      setAnnouncement(getAnnouncement(last, t))
    }
  }, [last, t])

  return (
    <div role="status" className="u-visuallyhidden">
      {announcement}
    </div>
  )
}
