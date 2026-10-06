import { MessagePrimitive, useMessage } from '@assistant-ui/react'
import React from 'react'

import Alert from 'cozy-ui/transpiled/react/Alert'
import Button from 'cozy-ui/transpiled/react/Buttons'
import Markdown from 'cozy-ui/transpiled/react/Markdown'
import Spinner from 'cozy-ui/transpiled/react/Spinner'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { ScribeCapabilityCard } from '@/components/Scribe/ScribeCapabilityCard'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeSources } from '@/components/Scribe/ScribeSources'
import styles from '@/components/Scribe/styles.styl'

function getText(message) {
  return message.content
    .filter(part => part.type === 'text')
    .map(part => part.text)
    .join('')
}

function AnswerActionButton({ action, text }) {
  const handleClick = () => action.onClick(text)

  return (
    <Button
      size="small"
      variant="secondary"
      className="u-mr-half u-mt-half"
      label={action.label}
      onClick={handleClick}
    />
  )
}

/**
 * An answer of the LLM, with the buttons of the actions of the app once it
 * is complete, and the call of a capability of the app it proposes
 */
export function ScribeAnswer() {
  const { t } = useI18n()
  const { answerActions, capabilities } = useScribe()
  const messageId = useMessage(message => message.id)
  const text = useMessage(getText)
  const status = useMessage(message => message.status?.type)
  const isError = useMessage(
    message => message.metadata?.custom?.isError === true
  )
  const isEmpty = useMessage(
    message => message.metadata?.custom?.isEmpty === true
  )
  const sources = useMessage(message => message.metadata?.custom?.sources)
  const action = useMessage(message => message.metadata?.custom?.action)
  const capability =
    action && capabilities.find(capability => capability.name === action.name)

  const isThinking = status === 'running' && text === ''
  // Only a whole answer goes into the document of the app
  const canAct = status === 'complete' && !isEmpty && text !== ''

  return (
    <MessagePrimitive.Root
      className={styles['scribe-answer']}
      data-testid="scribe-answer"
    >
      {isThinking && (
        <div role="status" aria-label={t('scribe.thinking')}>
          <Spinner size="small" noMargin />
        </div>
      )}
      {text !== '' && <Markdown content={text} />}
      {isError && <Alert severity="error">{t('scribe.error')}</Alert>}
      {isEmpty && (
        <Typography color="textSecondary">{t('scribe.empty')}</Typography>
      )}
      {sources && <ScribeSources sources={sources} />}
      {canAct && answerActions.length > 0 && (
        <div className="u-flex u-flex-wrap">
          {answerActions.map(action => (
            <AnswerActionButton key={action.name} action={action} text={text} />
          ))}
        </div>
      )}
      {capability && status === 'complete' && (
        <ScribeCapabilityCard
          messageId={messageId}
          capability={capability}
          params={action.params ?? {}}
          text={text}
        />
      )}
    </MessagePrimitive.Root>
  )
}
