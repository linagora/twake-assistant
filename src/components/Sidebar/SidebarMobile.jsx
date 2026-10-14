import cx from 'classnames'
import React, { useRef } from 'react'

import { Ai, Cross, Icon, Magnifier, Note } from '@linagora/twake-icons'
import flag from 'cozy-flags'
import Drawer from 'cozy-ui/transpiled/react/Drawer'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import List from 'cozy-ui/transpiled/react/List'
import ListItem from 'cozy-ui/transpiled/react/ListItem'
import ListItemIcon from 'cozy-ui/transpiled/react/ListItemIcon'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { SidebarComingSoon } from './SidebarComingSoon'
import { SidebarConversations } from './SidebarConversations'
import { SidebarMobileToolbar } from './SidebarMobileToolbar'
import styles from './styles.styl'
import itemStyles from '../Assistant/styles.styl'

const MenuItem = ({ icon, label, onClick }) => (
  <ListItem
    button
    onClick={onClick}
    className={cx('u-ph-half', itemStyles['sidebar-item'])}
  >
    <ListItemIcon className={itemStyles['sidebar-item-icon']}>
      <Icon icon={icon} size={16} aria-hidden="true" />
    </ListItemIcon>
    <ListItemText
      className="u-m-0"
      primary={label}
      primaryTypographyProps={{ variant: 'body2' }}
    />
  </ListItem>
)

export const SidebarMobile = ({
  className,
  open,
  onToggle,
  onClose,
  onToggleSearch,
  onCreateNewConversation
}) => {
  const { t } = useI18n()
  const containerRef = useRef(null)

  const handleToggleSearch = () => {
    onToggleSearch()
    onClose()
  }

  // The menu of the design covers the whole screen, bar included: its
  // header names the app, as the bar does, and closes it
  return (
    <>
      <SidebarMobileToolbar onToggle={onToggle} />
      <div ref={containerRef}>
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          // Kept in the assistant dialog: a portal would lose the theme
          // class cozy-ui's Dialog sets on its own portal. Its container
          // is its own parent: with the body, Material UI would hide the
          // whole page from assistive technologies, the menu included
          ModalProps={{
            disablePortal: true,
            container: () => containerRef.current
          }}
          className={styles['sidebar-drawer--mobile']}
          classes={{
            paper: cx(
              styles['sidebar-paper'],
              styles['sidebar-paper--mobile'],
              className
            )
          }}
        >
          <div className="u-flex u-flex-items-center u-flex-justify-between u-ph-1 u-pv-half">
            <div className="u-flex u-flex-items-center">
              <Ai width={24} height={24} aria-hidden="true" />
              <Typography variant="h4" component="h1" className="u-ml-half">
                {t('assistant.sidebar.app')}
              </Typography>
            </div>
            <IconButton
              size="small"
              onClick={onClose}
              aria-label={t('assistant.sidebar.close_sidebar')}
            >
              <Icon icon={Cross} size={16} aria-hidden="true" />
            </IconButton>
          </div>
          <List className="u-ph-1 u-pt-1 u-pb-0">
            <MenuItem
              icon={Note}
              label={t('assistant.sidebar.new_discussion')}
              onClick={onCreateNewConversation}
            />
            {flag('cozy.assistant.search-conversation.enabled') && (
              <MenuItem
                icon={Magnifier}
                label={t('assistant.sidebar.search_discussions')}
                onClick={handleToggleSearch}
              />
            )}
          </List>
          <SidebarConversations />
          <SidebarComingSoon className="u-m-1 u-mt-half" />
        </Drawer>
      </div>
    </>
  )
}
