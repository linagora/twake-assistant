import { ThreadPrimitive, useThread } from '@assistant-ui/react'
import React, { useState } from 'react'

import {
  CrossSmall,
  History,
  Icon,
  Note,
  Previous
} from '@linagora/twake-icons'
import { RealTimeQueries } from 'cozy-client'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import Tooltip from 'cozy-ui/transpiled/react/Tooltip'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import DocumentAssistant from '@/assets/illu-document-assistant.svg'
import { ScribeAnswer } from '@/components/Scribe/ScribeAnswer'
import { ScribeComposer } from '@/components/Scribe/ScribeComposer'
import { ScribeHistory } from '@/components/Scribe/ScribeHistory'
import { ScribeProvider, useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeRequest } from '@/components/Scribe/ScribeRequest'
import { ScribeSuggestions } from '@/components/Scribe/ScribeSuggestions'
import styles from '@/components/Scribe/styles.styl'
import { makeConversationId } from '@/components/helpers'
import { DOCTYPE_AI_CHAT_CONVERSATIONS } from '@/doctypes'
import { makeChatMessages } from '@/lib/scribe'

const MESSAGE_COMPONENTS = {
  UserMessage: ScribeRequest,
  AssistantMessage: ScribeAnswer
}

function makeNewConversation() {
  return { id: makeConversationId(), messages: [] }
}

function HeaderButton({ label, isPressed, onClick, children }) {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        color="inherit"
        aria-label={label}
        aria-pressed={isPressed}
        onClick={onClick}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}

// Hidden, not unmounted, under the history: an answer goes on. Without a
// text, the app opened it on the user's documents, like the file list of
// Drive: the answers come from the whole Drive.
function ScribeConversation({ isHidden, hasText }) {
  const { t } = useI18n()
  const isEmpty = useThread(state => state.messages.length === 0)
  const requestCount = useThread(
    state => state.messages.filter(message => message.role === 'user').length
  )
  // The prompts are about the text: offered again when the app gives another
  const { textStart } = useScribe()
  const hasNewText = requestCount === textStart

  return (
    <ThreadPrimitive.Root
      className={`u-flex u-flex-column u-flex-auto u-ov-hidden${isHidden ? ' u-hide' : ''}`}
    >
      <ThreadPrimitive.Viewport
        autoScroll
        className={styles['scribe-messages']}
      >
        {isEmpty && (
          <div className="u-flex u-flex-column u-flex-items-center u-flex-justify-center u-h-100 u-pt-2 u-bxz">
            <DocumentAssistant aria-hidden="true" />
            <Typography
              variant="body2"
              component="h2"
              color="textSecondary"
              className="u-ta-center u-mt-1-half u-mb-1 u-o-70"
            >
              {t(hasText ? 'scribe.welcome' : 'scribe.welcome_documents')}
            </Typography>
            <ScribeSuggestions />
          </div>
        )}
        <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />
      </ThreadPrimitive.Viewport>
      <div className={styles['scribe-footer']}>
        {!isEmpty && hasNewText && <ScribeSuggestions />}
        <ScribeComposer
          placeholder={
            hasText
              ? t('scribe.placeholder')
              : t('scribe.placeholder_documents', {
                  folder: t('assistant.twake_knowledges.drive')
                })
          }
        />
        <Typography
          variant="overline"
          color="textSecondary"
          component="p"
          className="u-mt-1 u-mb-0 u-ta-center"
        >
          {t('assistant.disclaimer')}
        </Typography>
      </div>
    </ThreadPrimitive.Root>
  )
}

/**
 * The assistant as a scribe: it works on a text of the app that opened it,
 * and hands its answers back. See ScribeProvider for the other props.
 *
 * @param {object} props
 * @param {Function} [props.onClose] - no close button without it
 */
export function ScribeView({ onClose, ...props }) {
  const { t } = useI18n()
  const [conversation, setConversation] = useState(makeNewConversation)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const handleNew = () => {
    setConversation(makeNewConversation())
    setIsHistoryOpen(false)
  }
  const handleToggleHistory = () => setIsHistoryOpen(isOpen => !isOpen)
  const handleCloseHistory = () => setIsHistoryOpen(false)
  const handleOpen = past => {
    if (past._id !== conversation.id) {
      setConversation({
        id: past._id,
        messages: makeChatMessages(past.messages, t)
      })
    }
    setIsHistoryOpen(false)
  }

  return (
    <div className={styles['scribe']}>
      <RealTimeQueries doctype={DOCTYPE_AI_CHAT_CONVERSATIONS} />
      <header className="u-flex u-flex-items-center u-flex-shrink-0 u-pt-1 u-ph-1">
        {isHistoryOpen && (
          <HeaderButton label={t('scribe.back')} onClick={handleCloseHistory}>
            <Icon icon={Previous} size={16} />
          </HeaderButton>
        )}
        <Typography
          variant="h5"
          component="h1"
          className="u-flex-auto u-ellipsis"
        >
          {t('scribe.title')}
        </Typography>
        <HeaderButton label={t('scribe.new')} onClick={handleNew}>
          <Icon icon={Note} size={16} color="var(--secondaryTextColor)" />
        </HeaderButton>
        <HeaderButton
          label={t('scribe.history.title')}
          isPressed={isHistoryOpen}
          onClick={handleToggleHistory}
        >
          <Icon icon={History} size={16} color="var(--secondaryTextColor)" />
        </HeaderButton>
        {onClose && (
          <HeaderButton label={t('scribe.close')} onClick={onClose}>
            <Icon
              icon={CrossSmall}
              size={16}
              color="var(--secondaryTextColor)"
            />
          </HeaderButton>
        )}
      </header>
      {isHistoryOpen && (
        <ScribeHistory conversationId={conversation.id} onOpen={handleOpen} />
      )}
      <ScribeProvider
        key={conversation.id}
        {...props}
        conversationId={conversation.id}
        messages={conversation.messages}
      >
        <ScribeConversation
          isHidden={isHistoryOpen}
          hasText={Boolean(props.text)}
        />
      </ScribeProvider>
    </div>
  )
}
