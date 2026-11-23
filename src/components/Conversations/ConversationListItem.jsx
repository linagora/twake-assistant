import cx from 'classnames'
import React, { useState } from 'react'

import ListItem from 'cozy-ui/transpiled/react/ListItem'
import ListItemSecondaryAction from 'cozy-ui/transpiled/react/ListItemSecondaryAction'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import Tooltip from 'cozy-ui/transpiled/react/Tooltip'
import { useI18n } from 'twake-i18n'

import { getNameOfConversation } from '../helpers'
import ConversationActions from './ConversationActions'
import styles from './styles.styl'

const ConversationListItem = ({
  conversation,
  selected,
  onOpenConversation,
  onDelete
}) => {
  const { t } = useI18n()
  const [isTruncated, setIsTruncated] = useState(false)
  const name = getNameOfConversation(conversation, t)

  // Measured on hover, before the tooltip delay ends: the full name is only
  // shown when the sidebar cuts it
  const handleNameMouseEnter = event => {
    const { scrollWidth, clientWidth } = event.currentTarget
    setIsTruncated(scrollWidth > clientWidth)
  }

  return (
    <ListItem
      button
      onClick={() => onOpenConversation(conversation._id)}
      className={cx('u-ov-hidden u-ph-half', styles['conversation-list-item'], {
        [styles['conversation-list-item--selected']]: selected
      })}
      ContainerProps={{
        className: styles['conversation-list-item-container']
      }}
      selected={selected}
    >
      <ListItemText
        className="u-m-0"
        primaryTypographyProps={{
          component: 'div',
          className: styles['conversation-list-item-text']
        }}
        primary={
          <Tooltip
            title={isTruncated ? name : ''}
            placement="right"
            enterDelay={500}
          >
            <span
              className={cx(
                'u-ellipsis u-db',
                styles['conversation-list-item-title']
              )}
              onMouseEnter={handleNameMouseEnter}
            >
              {name}
            </span>
          </Tooltip>
        }
      />
      <ListItemSecondaryAction
        className={styles['conversation-list-item-secondary-action']}
      >
        <ConversationActions
          buttonClassName={styles['conversation-list-item-menu-button']}
          conversation={conversation}
          onDelete={onDelete}
        />
      </ListItemSecondaryAction>
    </ListItem>
  )
}

// Memoized so a conversation switch only re-renders the items whose props
// changed, not the ActionsMenu of every item
export default React.memo(ConversationListItem)
