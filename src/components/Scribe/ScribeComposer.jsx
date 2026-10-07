import {
  ComposerPrimitive,
  useComposer,
  useComposerRuntime,
  useThread
} from '@assistant-ui/react'
import React from 'react'

import { ArrowUp, Drive, Icon, Stop } from '@linagora/twake-icons'
import { isMobile as isMobileDevice } from 'cozy-device-helper'
import Button from 'cozy-ui/transpiled/react/Buttons'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import Tooltip from 'cozy-ui/transpiled/react/Tooltip'
import { useI18n } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'

// A round button, whatever the width a button has in cozy-ui
const SEND_BUTTON_CLASS = 'u-miw-auto u-w-2 u-h-2 u-bdrs-circle u-flex-shrink-0'
const SEND_BUTTON_CLASSES = { label: 'u-flex u-w-auto' }

/**
 * Where the user writes a request: Enter sends it, except on a phone or a
 * tablet, where it is a new line
 */
export function ScribeComposer() {
  const { t } = useI18n()
  const { hasDocuments, setHasDocuments } = useScribe()
  const composerRuntime = useComposerRuntime()
  const isRunning = useThread(state => state.isRunning)
  const isEmpty = useComposer(state => state.isEmpty)

  const handleSend = () => composerRuntime.send()
  const handleStop = () => composerRuntime.cancel()
  const handleToggleDocuments = () => setHasDocuments(value => !value)

  return (
    <ComposerPrimitive.Root
      className={`${styles['scribe-composer']} u-flex u-flex-items-end`}
    >
      <ComposerPrimitive.Input
        className={styles['scribe-composer-input']}
        placeholder={t('scribe.placeholder')}
        aria-label={t('scribe.placeholder')}
        rows={1}
        maxRows={8}
        autoFocus={!isMobileDevice()}
        submitOnEnter={!isMobileDevice()}
      />
      <div className="u-flex u-flex-items-center u-flex-shrink-0 u-ml-half">
        <Tooltip title={t('scribe.documents')}>
          <IconButton
            size="small"
            className={
              hasDocuments ? null : styles['scribe-composer-source--off']
            }
            aria-label={t('scribe.documents')}
            aria-pressed={hasDocuments}
            disabled={isRunning}
            onClick={handleToggleDocuments}
          >
            <Icon icon={Drive} size={16} />
          </IconButton>
        </Tooltip>
        {isRunning ? (
          <Button
            size="small"
            className={SEND_BUTTON_CLASS}
            classes={SEND_BUTTON_CLASSES}
            aria-label={t('scribe.stop')}
            label={<Icon icon={Stop} size={12} />}
            onClick={handleStop}
          />
        ) : (
          <Button
            size="small"
            variant="primary"
            className={SEND_BUTTON_CLASS}
            classes={SEND_BUTTON_CLASSES}
            aria-label={t('scribe.send')}
            disabled={isEmpty}
            label={<Icon icon={ArrowUp} size={16} />}
            onClick={handleSend}
          />
        )}
      </div>
    </ComposerPrimitive.Root>
  )
}
