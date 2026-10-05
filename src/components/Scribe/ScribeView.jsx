import { ThreadPrimitive, useThread } from '@assistant-ui/react'
import React from 'react'

import { Ai } from '@linagora/twake-icons'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { ScribeAnswer } from '@/components/Scribe/ScribeAnswer'
import { ScribeComposer } from '@/components/Scribe/ScribeComposer'
import { ScribeProvider } from '@/components/Scribe/ScribeProvider'
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

  return (
    <ThreadPrimitive.Root className={styles['scribe']}>
      <header className={styles['scribe-header']}>
        <Ai width={24} height={24} aria-hidden="true" />
        <Typography variant="h6" component="h1" className="u-ml-half">
          {t('scribe.title')}
        </Typography>
      </header>
      <ThreadPrimitive.Viewport
        autoScroll
        className={styles['scribe-messages']}
      >
        {isEmpty && (
          <Typography
            variant="h4"
            component="h2"
            className={styles['scribe-welcome']}
          >
            {t('scribe.welcome')}
          </Typography>
        )}
        <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />
      </ThreadPrimitive.Viewport>
      <div className={styles['scribe-footer']}>
        {isEmpty && <ScribeSuggestions />}
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
