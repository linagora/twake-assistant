import { ComposerPrimitive, useThread } from '@assistant-ui/react'
import React from 'react'

import { Drive, Icon } from '@linagora/twake-icons'
import { isMobile as isMobileDevice } from 'cozy-device-helper'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import Tooltip from 'cozy-ui/transpiled/react/Tooltip'
import { useI18n } from 'twake-i18n'

import { ConversationSendButton } from '@/components/Conversations/ConversationSendButton'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'

/**
 * Where the user writes a request: Enter sends it, except on a phone or a
 * tablet, where it is a new line. Escape closes a compact scribe.
 *
 * @param {object} props
 * @param {string} props.placeholder
 * @param {object} [props.inputRef]
 */
export function ScribeComposer({ placeholder, inputRef }) {
  const { t } = useI18n()
  const { hasDocuments, setHasDocuments, layout, onCancel } = useScribe()
  const isRunning = useThread(state => state.isRunning)

  const handleToggleDocuments = () => setHasDocuments(value => !value)
  const documentsLabel = t('scribe.documents', {
    folder: t('assistant.twake_knowledges.drive')
  })
  const handleKeyDown = event => {
    if (event.key === 'Escape' && layout === 'compact') onCancel?.()
  }

  return (
    <ComposerPrimitive.Root
      className={`${styles['scribe-composer']} u-flex u-flex-items-end`}
    >
      <ComposerPrimitive.Input
        ref={inputRef}
        className={`${styles['scribe-composer-input']} u-fz-small`}
        placeholder={placeholder}
        aria-label={placeholder}
        rows={1}
        maxRows={8}
        autoFocus={!isMobileDevice()}
        submitOnEnter={!isMobileDevice()}
        onKeyDown={handleKeyDown}
      />
      <div className="u-flex u-flex-items-center u-flex-shrink-0 u-ml-half">
        <Tooltip title={documentsLabel}>
          <IconButton
            size="small"
            className={
              hasDocuments ? null : styles['scribe-composer-source--off']
            }
            aria-label={documentsLabel}
            aria-pressed={hasDocuments}
            disabled={isRunning}
            onClick={handleToggleDocuments}
          >
            <Icon icon={Drive} size={16} />
          </IconButton>
        </Tooltip>
        <ConversationSendButton />
      </div>
    </ComposerPrimitive.Root>
  )
}
