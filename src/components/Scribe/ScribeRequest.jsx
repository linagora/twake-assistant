import { MessagePrimitive } from '@assistant-ui/react'
import React from 'react'

import Typography from 'cozy-ui/transpiled/react/Typography'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'
import { useIsInLatestExchange } from '@/components/Scribe/useLatestExchange'

function RequestText({ text }) {
  return <Typography>{text}</Typography>
}

const PART_COMPONENTS = { Text: RequestText }

/**
 * A message of the user: in the compact layout, the one of the latest
 * exchange only
 */
export function ScribeRequest() {
  const { layout } = useScribe()
  const isInLatestExchange = useIsInLatestExchange()

  if (layout === 'compact' && !isInLatestExchange) return null

  return (
    <MessagePrimitive.Root className={styles['scribe-request']}>
      <MessagePrimitive.Parts components={PART_COMPONENTS} />
    </MessagePrimitive.Root>
  )
}
