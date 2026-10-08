import { MessagePrimitive, useMessage } from '@assistant-ui/react'
import React from 'react'

import Alert from 'cozy-ui/transpiled/react/Alert'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import AssistantMessageActions from './AssistantMessageActions'
import MarkdownText from './MarkdownText'
import styles from './styles.styl'

import { Sources } from '@/components/Messages/Sources'

const useIsErrorMessage = () => {
  return useMessage(s => s.metadata?.custom?.isError === true)
}

const AssistantMessage = () => {
  const { t } = useI18n()

  // Before the first words of the answer
  const isThinking = useMessage(
    s =>
      s.status?.type === 'running' &&
      !s.content.some(part => part.type === 'text' && part.text !== '')
  )
  const isEmpty = useMessage(s => s.metadata?.custom?.isEmpty === true)
  const isError = useIsErrorMessage()
  const sources = useMessage(s => s.metadata?.custom?.sources)

  return (
    <MessagePrimitive.Root className="u-mt-1-half">
      {isThinking && (
        <div
          role="status"
          aria-label={t('assistant.message.running')}
          className={styles['thinking-dots']}
        >
          <span className={styles['thinking-dot']} />
          <span className={styles['thinking-dot']} />
          <span className={styles['thinking-dot']} />
        </div>
      )}
      {isError ? (
        <Alert severity="error">{t('assistant.default_error')}</Alert>
      ) : (
        <MessagePrimitive.Content
          components={{
            Text: MarkdownText
          }}
        />
      )}
      {isEmpty && (
        <Typography color="textSecondary">
          {t('assistant.default_empty_response')}
        </Typography>
      )}
      {sources?.length > 0 && <Sources sources={sources} />}
      {!isThinking && <AssistantMessageActions canCopy={!isError} />}
    </MessagePrimitive.Root>
  )
}

export default AssistantMessage
