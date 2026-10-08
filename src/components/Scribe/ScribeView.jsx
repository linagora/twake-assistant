import { ThreadPrimitive, useThread } from '@assistant-ui/react'
import React, { useState } from 'react'

import { CrossSmall, Icon, Note } from '@linagora/twake-icons'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import Tooltip from 'cozy-ui/transpiled/react/Tooltip'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import DocumentAssistant from '@/assets/illu-document-assistant.svg'
import { ScribeAnswer } from '@/components/Scribe/ScribeAnswer'
import { ScribeComposer } from '@/components/Scribe/ScribeComposer'
import { ScribeProvider, useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeRequest } from '@/components/Scribe/ScribeRequest'
import { ScribeSuggestions } from '@/components/Scribe/ScribeSuggestions'
import styles from '@/components/Scribe/styles.styl'
import { makeConversationId } from '@/lib/conversation'

const MESSAGE_COMPONENTS = {
  UserMessage: ScribeRequest,
  AssistantMessage: ScribeAnswer
}

function HeaderButton({ label, onClick, children }) {
  return (
    <Tooltip title={label}>
      <IconButton size="small" aria-label={label} onClick={onClick}>
        {children}
      </IconButton>
    </Tooltip>
  )
}

function ScribeConversation() {
  const { t } = useI18n()
  const isEmpty = useThread(state => state.messages.length === 0)
  const requestCount = useThread(
    state => state.messages.filter(message => message.role === 'user').length
  )
  // The prompts are about the text: offered again when the app gives another
  const { textStart } = useScribe()
  const hasNewText = requestCount === textStart

  return (
    <ThreadPrimitive.Root className="u-flex u-flex-column u-flex-auto u-ov-hidden">
      <ThreadPrimitive.Viewport
        autoScroll
        className={styles['scribe-messages']}
      >
        {isEmpty && (
          <div className="u-flex u-flex-column u-flex-items-center u-flex-justify-center u-h-100 u-pt-2">
            <DocumentAssistant aria-hidden="true" />
            <Typography
              variant="body2"
              component="h2"
              color="textSecondary"
              className="u-ta-center u-mt-1-half u-mb-1 u-o-70"
            >
              {t('scribe.welcome')}
            </Typography>
            <ScribeSuggestions />
          </div>
        )}
        <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />
      </ThreadPrimitive.Viewport>
      <div className={styles['scribe-footer']}>
        {!isEmpty && hasNewText && <ScribeSuggestions />}
        <ScribeComposer />
        <Typography
          variant="overline"
          color="textSecondary"
          component="p"
          className="u-mt-1 u-mb-0 u-ta-center"
        >
          {t('scribe.disclaimer')}
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
  const [conversationId, setConversationId] = useState(makeConversationId)

  const handleNew = () => setConversationId(makeConversationId())

  return (
    <div className={styles['scribe']}>
      <header className="u-flex u-flex-items-center u-flex-shrink-0 u-pt-half u-ph-1">
        <Typography
          variant="h5"
          component="h1"
          className="u-flex-auto u-ellipsis"
        >
          {t('scribe.title')}
        </Typography>
        <HeaderButton label={t('scribe.new')} onClick={handleNew}>
          <Icon icon={Note} size={20} />
        </HeaderButton>
        {onClose && (
          <HeaderButton label={t('scribe.close')} onClick={onClose}>
            <Icon icon={CrossSmall} size={20} />
          </HeaderButton>
        )}
      </header>
      <ScribeProvider
        key={conversationId}
        {...props}
        conversationId={conversationId}
      >
        <ScribeConversation />
      </ScribeProvider>
    </div>
  )
}
