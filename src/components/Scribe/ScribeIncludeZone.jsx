import { useThread } from '@assistant-ui/react'
import React, { useId } from 'react'

import Checkbox from 'cozy-ui/transpiled/react/Checkbox'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'

/**
 * What the next request includes: the whole document when the app can give
 * it, the conversation so far, and the text of the app when there is one
 */
export function ScribeIncludeZone() {
  const { t } = useI18n()
  const {
    text,
    isDocumentAvailable,
    hasDocument,
    setHasDocument,
    hasConversation,
    setHasConversation,
    hasSelection,
    setHasSelection
  } = useScribe()
  const isRunning = useThread(state => state.isRunning)
  const titleId = useId()

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
        {isDocumentAvailable && (
          <Checkbox
            size="small"
            label={t('scribe.include.document')}
            checked={hasDocument}
            disabled={isRunning}
            onChange={event => setHasDocument(event.target.checked)}
          />
        )}
        <Checkbox
          size="small"
          label={t('scribe.include.conversation')}
          checked={hasConversation}
          disabled={isRunning}
          onChange={event => setHasConversation(event.target.checked)}
        />
        {text !== '' && (
          <Checkbox
            size="small"
            label={t('scribe.include.selection')}
            checked={hasSelection}
            disabled={isRunning}
            onChange={event => setHasSelection(event.target.checked)}
          />
        )}
      </div>
    </div>
  )
}
