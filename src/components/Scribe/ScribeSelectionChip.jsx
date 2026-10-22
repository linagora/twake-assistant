import React from 'react'

import Typography from 'cozy-ui/transpiled/react/Typography'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'

/**
 * The text of the app the next request is about, on one line
 */
export function ScribeSelectionChip() {
  const { text, hasSelection } = useScribe()

  if (text === '' || !hasSelection) return null

  return (
    <div className={`${styles['scribe-selection']} u-mt-half`} title={text}>
      <Typography variant="body2" color="textSecondary" noWrap>
        {text}
      </Typography>
    </div>
  )
}
