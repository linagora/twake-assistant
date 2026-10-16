import React, { useId } from 'react'

import { Icon, Pin } from '@linagora/twake-icons'
import { isQueryLoading, useQuery } from 'cozy-client'
import List from 'cozy-ui/transpiled/react/List'
import ListItem from 'cozy-ui/transpiled/react/ListItem'
import ListItemSecondaryAction from 'cozy-ui/transpiled/react/ListItemSecondaryAction'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import Spinner from 'cozy-ui/transpiled/react/Spinner'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { remove } from '@/actions/delete'
import { pin } from '@/actions/pin'
import ConversationActions from '@/components/Conversations/ConversationActions'
import listStyles from '@/components/Conversations/styles.styl'
import styles from '@/components/Scribe/styles.styl'
import { formatConversationDate, isPinned } from '@/components/helpers'
import {
  getScribeConversationDescription,
  getScribeConversationTitle
} from '@/lib/scribe'
import {
  buildConversationsQuery,
  buildPinnedConversationsQuery
} from '@/queries'

const conversationsQuery = buildConversationsQuery()
const pinnedConversationsQuery = buildPinnedConversationsQuery()
const historyActions = [pin, remove]

const byLastUpdate = (a, b) =>
  (b.cozyMetadata?.updatedAt ?? '').localeCompare(
    a.cozyMetadata?.updatedAt ?? ''
  )

/**
 * The pinned conversations first, then the others, the last updated first
 * in each: the pinned ones come with their own query, as the other one
 * stops at the last conversations
 */
export function orderHistory(pinned, recent) {
  const conversations = [
    ...new Map(
      [...recent, ...pinned].map(conversation => [
        conversation._id,
        conversation
      ])
    ).values()
  ]
  return [
    ...conversations.filter(isPinned).sort(byLastUpdate),
    ...conversations
      .filter(conversation => !isPinned(conversation))
      .sort(byLastUpdate)
  ]
}

function HistoryItem({ conversation, isSelected, onOpen, onDelete }) {
  const { t, lang } = useI18n()

  return (
    <ListItem
      button
      size="small"
      gutters="disabled"
      className="u-ph-half u-bdrs-4"
      selected={isSelected}
      onClick={() => onOpen(conversation)}
      ContainerProps={{
        className: listStyles['conversation-list-item-container']
      }}
    >
      <ListItemText
        className={listStyles['conversation-list-item-text']}
        primary={getScribeConversationTitle(conversation, t)}
        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
        secondary={
          <>
            <Typography
              variant="caption"
              color="textSecondary"
              component="span"
              display="block"
              noWrap
            >
              {getScribeConversationDescription(conversation)}
            </Typography>
            <Typography
              variant="overline"
              color="textPrimary"
              component="span"
              display="block"
            >
              {isPinned(conversation) && (
                <Icon
                  icon={Pin}
                  size={10}
                  className="u-mr-half"
                  role="img"
                  aria-label={t('scribe.history.pinned')}
                />
              )}
              {formatConversationDate(
                conversation.cozyMetadata?.updatedAt,
                t,
                lang
              )}
            </Typography>
          </>
        }
        secondaryTypographyProps={{ component: 'div' }}
      />
      <ListItemSecondaryAction
        className={listStyles['conversation-list-item-secondary-action']}
      >
        <ConversationActions
          actions={historyActions}
          buttonClassName={listStyles['conversation-list-item-menu-button']}
          conversation={conversation}
          onDelete={onDelete}
        />
      </ListItemSecondaryAction>
    </ListItem>
  )
}

function HistoryContent({ conversationId, labelId, onOpen, onDelete }) {
  const { t } = useI18n()
  const result = useQuery(
    conversationsQuery.definition,
    conversationsQuery.options
  )
  const pinnedResult = useQuery(
    pinnedConversationsQuery.definition,
    pinnedConversationsQuery.options
  )
  const conversations = orderHistory(pinnedResult.data ?? [], result.data ?? [])

  if (isQueryLoading(result) || isQueryLoading(pinnedResult)) {
    return (
      <div className="u-flex-auto">
        <Spinner size="large" className="u-flex u-flex-justify-center" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="u-flex-auto">
        <Typography color="textSecondary" className="u-ta-center u-mt-2">
          {t('scribe.history.empty')}
        </Typography>
      </div>
    )
  }

  return (
    <List
      className={`u-flex-auto u-ov-auto u-ph-1 ${styles['scribe-history']}`}
      aria-labelledby={labelId}
    >
      {conversations.map(conversation => (
        <HistoryItem
          key={conversation._id}
          conversation={conversation}
          isSelected={conversation._id === conversationId}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </List>
  )
}

/**
 * The past conversations, the pinned ones then the last one first: a click
 * opens one in the scribe, its menu pins or deletes it
 */
export function ScribeHistory(props) {
  const { t } = useI18n()
  const labelId = useId()

  return (
    <>
      <Typography
        variant="caption"
        id={labelId}
        component="h2"
        color="textSecondary"
        className="u-mt-1 u-ph-1"
      >
        {t('scribe.history.title')}
      </Typography>
      <HistoryContent {...props} labelId={labelId} />
    </>
  )
}
