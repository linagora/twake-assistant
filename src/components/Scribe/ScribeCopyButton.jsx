import React from 'react'

import { Check, Copy, Icon } from '@linagora/twake-icons'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import Tooltip from 'cozy-ui/transpiled/react/Tooltip'
import { useI18n } from 'twake-i18n'

import styles from '@/components/Scribe/styles.styl'
import { useDone } from '@/components/Scribe/useDone'
import { copyAnswer } from '@/lib/clipboard'

const ICON_SIZE = 16

/**
 * Copies a text, in Markdown, to the clipboard
 *
 * @param {object} props
 * @param {string} props.text
 */
export function ScribeCopyButton({ text }) {
  const { t } = useI18n()
  const [isCopied, markCopied] = useDone()
  const label = t(isCopied ? 'scribe.actions.copied' : 'scribe.actions.copy')

  const handleClick = async () => {
    try {
      await copyAnswer(text)
      markCopied()
    } catch {
      // A refused write, as in a frame without the permission, shows no check
    }
  }

  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        className="u-mr-half u-mt-half"
        aria-label={label}
        onClick={handleClick}
      >
        {isCopied ? (
          <Icon
            icon={Check}
            size={ICON_SIZE}
            className={styles['scribe-check']}
            data-testid="scribe-check"
          />
        ) : (
          <Icon icon={Copy} size={ICON_SIZE} />
        )}
      </IconButton>
    </Tooltip>
  )
}
