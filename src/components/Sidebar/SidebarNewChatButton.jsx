import React from 'react'

import { Icon, Plus } from '@linagora/twake-icons'
import Button from 'cozy-ui/transpiled/react/Buttons'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import { useI18n } from 'twake-i18n'

export const SidebarNewChatButton = ({ isExpanded, onClick }) => {
  const { t } = useI18n()

  if (!isExpanded) {
    return (
      <div className="u-pb-half u-ph-1">
        <IconButton
          size="medium"
          className="u-bg-primaryColor u-white u-bdrs-6"
          onClick={onClick}
          aria-label={t('assistant.sidebar.create_new')}
        >
          <Icon icon={Plus} aria-hidden="true" />
        </IconButton>
      </div>
    )
  }

  return (
    <div className="u-pb-half u-ph-1">
      <Button
        className="u-w-100 u-bdrs-6 u-fz-small"
        label={t('assistant.sidebar.create_new')}
        startIcon={<Icon icon={Plus} size={12} />}
        fullWidth
        variant="primary"
        onClick={onClick}
      />
    </div>
  )
}
