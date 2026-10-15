import cx from 'classnames'
import React, { useCallback, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

import flag from 'cozy-flags'
import LoadMore from 'cozy-ui/transpiled/react/LoadMore'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import styles from './styles.styl'
import useConversation from '../../hooks/useConversation'
import useFetchConversations from '../../hooks/useFetchConversations'
import AssistantSidebarItem from '../Assistant/AssistantSidebarItem'
import { useAssistant } from '../AssistantProvider'
import ConversationList from '../Conversations/ConversationList'
import { makeConversationId } from '../helpers'

export const SidebarConversations = () => {
  const { t } = useI18n()
  const { conversationId } = useParams()
  const { isOpenSearchConversation } = useAssistant()
  const { goToConversation } = useConversation()
  const { conversations, hasMore, fetchMore } = useFetchConversations()

  // Read on a delete rather than a dependency of `handleDelete`: a stable
  // `handleDelete` lets the memoized list items skip a conversation switch
  const conversationIdRef = useRef(conversationId)
  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  // The open conversation is deleted: a new one takes its place in the
  // history, so that Back does not return to the deleted one
  const handleDelete = useCallback(
    conversation => {
      if (conversation._id === conversationIdRef.current) {
        goToConversation(makeConversationId(), { replace: true })
      }
    },
    [goToConversation]
  )

  return (
    <>
      {flag('cozy.assistant.create-assistant.enabled') && (
        <div className="u-ph-1 u-mt-1">
          <AssistantSidebarItem />
        </div>
      )}
      <Typography
        variant="caption"
        color="textSecondary"
        component="h2"
        className="u-ph-1 u-mt-1 u-mb-half"
      >
        {t('assistant.sidebar.recent_chats')}
      </Typography>
      <div
        className={cx(
          'u-flex-auto u-ov-auto u-ph-1 u-pb-half',
          styles['sidebar-conversations']
        )}
      >
        <ConversationList
          conversations={conversations}
          currentConversationId={
            isOpenSearchConversation ? null : conversationId
          }
          onOpenConversation={goToConversation}
          onDelete={handleDelete}
        />
        {hasMore && (
          <div className="u-flex u-flex-items-center u-flex-justify-center u-mt-1">
            <LoadMore
              fetchMore={fetchMore}
              label={t('assistant.sidebar.conversation.actions.load_more')}
            />
          </div>
        )}
      </div>
    </>
  )
}
