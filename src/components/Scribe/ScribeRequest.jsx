import { MessagePrimitive } from '@assistant-ui/react'
import React from 'react'

import Typography from 'cozy-ui/transpiled/react/Typography'

import styles from '@/components/Scribe/styles.styl'

function RequestText({ text }) {
  return <Typography>{text}</Typography>
}

const PART_COMPONENTS = { Text: RequestText }

/**
 * A message of the user
 */
export function ScribeRequest() {
  return (
    <MessagePrimitive.Root className={styles['scribe-request']}>
      <MessagePrimitive.Parts components={PART_COMPONENTS} />
    </MessagePrimitive.Root>
  )
}
