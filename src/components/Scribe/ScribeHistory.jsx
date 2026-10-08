import React from 'react'

import { isQueryLoading, useQuery } from 'cozy-client'
import List from 'cozy-ui/transpiled/react/List'
import ListItem from 'cozy-ui/transpiled/react/ListItem'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import Spinner from 'cozy-ui/transpiled/react/Spinner'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { getScribeConversationTitle } from '@/lib/scribe'
import { buildConversationsQuery } from '@/queries'

const conversationsQuery = buildConversationsQuery()

/**
 * The past conversations, the last one first: a click opens one in the
 * scribe
 */
export function ScribeHistory({ conversationId, onOpen }) {
  const { t, f } = useI18n()
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
    <List
      className="u-flex-auto u-ov-auto"
      aria-label={t('scribe.history.title')}
    >
      {conversations.map(conversation => (
        <ListItem
          key={conversation._id}
          button
          selected={conversation._id === conversationId}
          onClick={() => onOpen(conversation)}
        >
          <ListItemText
            primary={getScribeConversationTitle(conversation, t)}
            primaryTypographyProps={{ noWrap: true }}
            secondary={f(conversation.cozyMetadata.updatedAt, 'PP')}
          />
        </ListItem>
      ))}
    </List>
  )
}
