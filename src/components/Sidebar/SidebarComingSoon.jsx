import cx from 'classnames'
import React from 'react'

import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import styles from './styles.styl'

/**
 * The card at the bottom of the sidebar announcing the next sources of the
 * assistant. On its own: its place and its content are meant to change.
 */
export const SidebarComingSoon = ({ className }) => {
  const { t } = useI18n()

  return (
    <div className={cx('u-p-half u-bdrs-8', styles['coming-soon'], className)}>
      {/* The caption of cozy-ui is secondary by default: the title is not.
          The lines breathe as in the design, which spaces them by 4px */}
      <Typography
        variant="caption"
        color="textPrimary"
        component="p"
        className="u-lh-xlarge"
      >
        {t('assistant.sidebar.coming_soon.title')}
      </Typography>
      <Typography
        variant="caption"
        color="textSecondary"
        component="p"
        className="u-lh-xlarge"
      >
        {t('assistant.sidebar.coming_soon.folders')}
      </Typography>
      <Typography
        variant="caption"
        color="textSecondary"
        component="p"
        className="u-lh-xlarge"
      >
        {t('assistant.sidebar.coming_soon.apps')}
      </Typography>
    </div>
  )
}
