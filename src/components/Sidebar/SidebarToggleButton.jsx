import React from 'react'

import { Icon, Menu } from '@linagora/twake-icons'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import { useI18n } from 'twake-i18n'

// The paper of the sidebar drawer, desktop and mobile: only one is rendered
export const SIDEBAR_ID = 'assistant-sidebar'

export const SidebarToggleButton = ({ isExpanded, onClick }) => {
  const { t } = useI18n()

  return (
    <IconButton
      size="small"
      onClick={onClick}
      aria-label={t('assistant.sidebar.toggle_sidebar')}
      aria-expanded={isExpanded}
      aria-controls={SIDEBAR_ID}
    >
      <Icon icon={Menu} size={16} aria-hidden="true" />
    </IconButton>
  )
}
