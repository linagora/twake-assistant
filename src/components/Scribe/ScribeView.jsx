import { ThreadPrimitive, useThread } from '@assistant-ui/react'
import React from 'react'

import { AssistantColor } from '@linagora/twake-icons'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { ScribeAnswer } from '@/components/Scribe/ScribeAnswer'
import { ScribeComposer } from '@/components/Scribe/ScribeComposer'
import { ScribeProvider, useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeRequest } from '@/components/Scribe/ScribeRequest'
import { ScribeSuggestions } from '@/components/Scribe/ScribeSuggestions'
import styles from '@/components/Scribe/styles.styl'

const MESSAGE_COMPONENTS = {
  UserMessage: ScribeRequest,
  AssistantMessage: ScribeAnswer
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
    <ThreadPrimitive.Root className={styles['scribe']}>
      <header className={styles['scribe-header']}>
        <Typography variant="h6" component="h1">
          {t('scribe.title')}
        </Typography>
      </header>
      <ThreadPrimitive.Viewport
        autoScroll
        className={styles['scribe-messages']}
      >
        {isEmpty && (
          <div className="u-flex u-flex-column u-flex-items-center u-flex-justify-center u-h-100">
            <AssistantColor width={48} height={48} aria-hidden="true" />
            <Typography
              variant="body2"
              component="h2"
              color="textSecondary"
              className="u-ta-center u-mv-1"
            >
              {t('scribe.welcome')}
            </Typography>
            <ScribeSuggestions isCentered />
          </div>
        )}
        <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />
      </ThreadPrimitive.Viewport>
      <div className={styles['scribe-footer']}>
        {!isEmpty && hasNewText && <ScribeSuggestions />}
        <ScribeComposer />
        <Typography
          variant="caption"
          color="textSecondary"
          component="p"
          className="u-mt-half u-mb-0 u-ta-center"
        >
          {t('scribe.disclaimer')}
        </Typography>
      </div>
    </ThreadPrimitive.Root>
  )
}

/**
 * The assistant as a scribe: it works on a text of the app that opened it,
 * and hands its answers back. See ScribeProvider for the props.
 */
export function ScribeView(props) {
  return (
    <ScribeProvider {...props}>
      <ScribeConversation />
    </ScribeProvider>
  )
}
