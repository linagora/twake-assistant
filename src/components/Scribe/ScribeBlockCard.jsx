import React from 'react'

import Markdown from 'cozy-ui/transpiled/react/Markdown'

import styles from '@/components/Scribe/styles.styl'
import { showHtmlTables } from '@/lib/htmlTables'

/**
 * An insert block of an answer, a text meant for the document of the app,
 * with its own actions as children
 *
 * @param {object} props
 * @param {string} props.text - the text of the block, in Markdown
 */
export function ScribeBlockCard({ text, children }) {
  return (
    <div data-scribe-card="block" className={styles['scribe-card']}>
      {text !== '' && <Markdown content={showHtmlTables(text)} />}
      {children}
    </div>
  )
}
