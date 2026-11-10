import { useThread } from '@assistant-ui/react'
import React, { useId } from 'react'

import Checkbox from 'cozy-ui/transpiled/react/Checkbox'
import Markdown from 'cozy-ui/transpiled/react/Markdown'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'
import { showHtmlTables } from '@/lib/htmlTables'

/**
 * What the next request is about: the text of the app, quoted, and the whole
 * document when the app can give it. The app gives another text as the user
 * selects one, with no button to show it was taken: the quote says so.
 */
export function ScribeIncludeZone() {
  const { t } = useI18n()
  const { text, isDocumentAvailable, hasDocument, setHasDocument } = useScribe()
  const isRunning = useThread(state => state.isRunning)
  const titleId = useId()

  if (!text && !isDocumentAvailable) return null

  return (
    <div className="u-mv-half">
      <Typography
        id={titleId}
        variant="overline"
        color="textSecondary"
        component="p"
        className="u-uppercase u-mb-0"
      >
        {t('scribe.include.title')}
      </Typography>
      <div
        role="group"
        aria-labelledby={titleId}
        className={`${styles['scribe-include']} u-flex u-flex-wrap u-flex-items-center`}
      >
        {text && (
          <Typography
            component="div"
            variant="body2"
            color="textSecondary"
            role="note"
            aria-label={t('scribe.include.selection')}
            className={`${styles['scribe-quote']} ${styles['scribe-quote--short']} u-w-100 u-mv-half`}
          >
            <Markdown content={showHtmlTables(text)} />
          </Typography>
        )}
        {isDocumentAvailable && (
          <Checkbox
            size="small"
            label={t('scribe.include.document')}
            checked={hasDocument}
            disabled={isRunning}
            onChange={event => setHasDocument(event.target.checked)}
          />
        )}
      </div>
    </div>
  )
}
