import { useThread } from '@assistant-ui/react'
import React, { useEffect, useRef, useState } from 'react'

import { useI18n } from 'twake-i18n'

import { getText } from '@/components/Messages/Answer'
import { toPlainText } from '@/lib/chat'
import { removeInsertFences } from '@/lib/scribeBlocks'

function getAnnouncement(message, capabilities, t) {
  const { status, metadata } = message
  // An error is an alert already
  if (status?.type === 'incomplete') {
    return status.reason === 'cancelled' ? t('chat.announce.stopped') : ''
  }
  const text = toPlainText(removeInsertFences(getText(message)))
  // The call of an app the view shows is in place of a text
  if (text === '') {
    const name = metadata?.custom?.action?.name
    return capabilities.some(capability => capability.name === name)
      ? ''
      : t('chat.errors.empty_response')
  }
  return t('chat.announce.complete', { text })
}

/**
 * Tells screen readers once that the answer of the thread is done, stopped
 * or empty: the streamed text itself is not live, or it would be read word
 * by word
 *
 * @param {object} props
 * @param {import('@/lib/scribe').ScribeCapability[]} [props.capabilities] -
 *   the capabilities whose calls the view shows
 */
export function AnswerAnnouncer({ capabilities = [] }) {
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
      setAnnouncement(getAnnouncement(last, capabilities, t))
    }
  }, [last, capabilities, t])

  return (
    <div role="status" className="u-visuallyhidden">
      {announcement}
    </div>
  )
}
