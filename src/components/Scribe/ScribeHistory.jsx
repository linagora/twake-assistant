import React, { useId } from 'react'

import { isQueryLoading, useQuery } from 'cozy-client'
import List from 'cozy-ui/transpiled/react/List'
import ListItem from 'cozy-ui/transpiled/react/ListItem'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import Spinner from 'cozy-ui/transpiled/react/Spinner'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { formatConversationDate } from '@/components/helpers'
import {
  getScribeConversationDescription,
  getScribeConversationTitle
} from '@/lib/scribe'
import { buildConversationsQuery } from '@/queries'

const conversationsQuery = buildConversationsQuery()

function HistoryItem({ conversation, isSelected, onOpen }) {
  const { t, lang } = useI18n()

  return (
    <ListItem
      button
      size="small"
      gutters="disabled"
      className="u-ph-half u-bdrs-4"
      selected={isSelected}
      onClick={() => onOpen(conversation)}
    >
      <ListItemText
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
    </ListItem>
  )
}

function HistoryContent({ conversationId, labelId, onOpen }) {
  const { t } = useI18n()
  const result = useQuery(
    conversationsQuery.definition,
    conversationsQuery.options
  )
  const conversations = result.data ?? []

  if (isQueryLoading(result)) {
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
    <List className="u-flex-auto u-ov-auto u-ph-1" aria-labelledby={labelId}>
      {conversations.map(conversation => (
        <HistoryItem
          key={conversation._id}
          conversation={conversation}
          isSelected={conversation._id === conversationId}
          onOpen={onOpen}
        />
      ))}
    </List>
  )
}

/**
 * The past conversations, the last one first: a click opens one in the
 * scribe
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
