import cx from 'classnames'
import React from 'react'

import ListItem from 'cozy-ui/transpiled/react/ListItem'
import ListItemSecondaryAction from 'cozy-ui/transpiled/react/ListItemSecondaryAction'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'

import ConversationActions from './ConversationActions'
import styles from './styles.styl'
import { getNameOfConversation } from '../helpers'

const ConversationListItem = ({
  conversation,
  selected,
  onOpenConversation
}) => {
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
          <span
            className={cx(
              'u-ellipsis u-db',
              styles['conversation-list-item-title']
            )}
          >
            {getNameOfConversation(conversation)}
          </span>
        }
      />
      <ListItemSecondaryAction
        className={styles['conversation-list-item-secondary-action']}
      >
        <ConversationActions
          buttonClassName={styles['conversation-list-item-menu-button']}
          conversation={conversation}
        />
      </ListItemSecondaryAction>
    </ListItem>
  )
}

// Memoized so a conversation switch only re-renders the items whose props
// changed, not the ActionsMenu of every item
export default React.memo(ConversationListItem)
