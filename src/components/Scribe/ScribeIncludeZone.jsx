import { useThread } from '@assistant-ui/react'
import React, { useId } from 'react'

import Checkbox from 'cozy-ui/transpiled/react/Checkbox'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'

/**
 * Whether the next request includes the whole document, when the app can
 * give it. The conversation and the text of the app always go with it.
 */
export function ScribeIncludeZone() {
  const { t } = useI18n()
  const { isDocumentAvailable, hasDocument, setHasDocument } = useScribe()
  const isRunning = useThread(state => state.isRunning)
  const titleId = useId()

  if (!isDocumentAvailable) return null

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
        <Checkbox
          size="small"
          label={t('scribe.include.document')}
          checked={hasDocument}
          disabled={isRunning}
          onChange={event => setHasDocument(event.target.checked)}
        />
      </div>
    </div>
  )
}
