import { MessagePrimitive, useMessage, useThread } from '@assistant-ui/react'
import React from 'react'

import Typography from 'cozy-ui/transpiled/react/Typography'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'
import { useIsInLatestExchange } from '@/components/Scribe/useLatestExchange'

function RequestText({ text }) {
  return <Typography>{text}</Typography>
}

const PART_COMPONENTS = { Text: RequestText }

function useRequestIndex() {
  const messageId = useMessage(message => message.id)
  return useThread(state =>
    state.messages
      .filter(message => message.role === 'user')
      .findIndex(message => message.id === messageId)
  )
}

/**
 * A message of the user: in the compact layout, the one of the latest
 * exchange only. It quotes the text of the app it sent: a request of a past
 * conversation kept it with the request.
 */
export function ScribeRequest() {
  const { layout, sentTexts } = useScribe()
  const isInLatestExchange = useIsInLatestExchange()
  const index = useRequestIndex()
  const selection = useMessage(message => message.metadata?.custom?.selection)

  if (layout === 'compact' && !isInLatestExchange) return null

  const quote = selection ?? sentTexts[index] ?? null

  return (
    <MessagePrimitive.Root className={styles['scribe-request']}>
      {quote !== null && (
        <Typography
          data-testid="scribe-quote"
          variant="body2"
          color="textSecondary"
          className={`${styles['scribe-quote']} u-mb-half`}
        >
          {quote}
        </Typography>
      )}
      <MessagePrimitive.Parts components={PART_COMPONENTS} />
    </MessagePrimitive.Root>
  )
}
