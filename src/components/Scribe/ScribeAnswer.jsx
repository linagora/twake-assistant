import {
  useMessage,
  useMessageRuntime,
  useThreadRuntime
} from '@assistant-ui/react'
import React from 'react'

import { Check, Icon } from '@linagora/twake-icons'
import Button from 'cozy-ui/transpiled/react/Buttons'
import { useI18n } from 'twake-i18n'

import { Answer, getText } from '@/components/Messages/Answer'
import { ScribeCapabilityCard } from '@/components/Scribe/ScribeCapabilityCard'
import { ScribeCopyButton } from '@/components/Scribe/ScribeCopyButton'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'
import { useDone } from '@/components/Scribe/useDone'
import { useIsInLatestExchange } from '@/components/Scribe/useLatestExchange'

function AnswerActionButton({ action, text }) {
  const [isDone, markDone] = useDone()

  const handleClick = () => {
    action.onClick(text)
    markDone()
  }

  return (
    <Button
      size="small"
      variant="secondary"
      className="u-mr-half u-mt-half"
      label={action.label}
      startIcon={
        isDone ? (
          <Icon
            icon={Check}
            size={16}
            className={styles['scribe-check']}
            data-testid="scribe-check"
          />
        ) : undefined
      }
      onClick={handleClick}
    />
  )
}

/**
 * An answer of the LLM, with Copy and the buttons of the actions of the app
 * once it is complete: in the compact layout, the one of the latest exchange
 * only
 */
export function ScribeAnswer() {
  const { t } = useI18n()
  const { answerActions, capabilities, layout } = useScribe()
  const isInLatestExchange = useIsInLatestExchange()
  const messageId = useMessage(message => message.id)
  const text = useMessage(getText)
  const status = useMessage(message => message.status?.type)
  const action = useMessage(message => message.metadata?.custom?.action)
  const isPast = useMessage(
    message => message.metadata?.custom?.isPast === true
  )
  // A past conversation may hold a call of another app: not shown then
  const capability =
    action && capabilities.find(capability => capability.name === action.name)
  const isError = useMessage(
    message => message.metadata?.custom?.isError === true
  )
  // Asking again fails again: the agent of the conversation is gone
  const isAssistantGone = useMessage(
    message => message.metadata?.custom?.isAssistantGone === true
  )
  // The model gave no text, as when its reasoning took all its tokens: it
  // may answer if asked again
  const hasNoAnswer = useMessage(
    message => message.metadata?.custom?.isEmpty === true
  )
  // Only the last answer of the current conversation: asking an earlier one
  // again would hide what follows it, and a past request has lost its prompt
  const isLast = useMessage(message => message.isLast)
  const canRetry =
    ((isError && !isAssistantGone) || hasNoAnswer) && isLast && !isPast
  const threadRuntime = useThreadRuntime()
  const messageRuntime = useMessageRuntime()
  const handleRetry = () => {
    const { parentId } = messageRuntime.getState()
    const request = threadRuntime
      .getState()
      .messages.find(message => message.id === parentId)
    messageRuntime.reload({
      runConfig: { custom: request?.metadata?.custom ?? {} }
    })
  }
  // Only a whole answer goes into the document of the app
  const canAct = status === 'complete' && text.trim() !== ''

  if (layout === 'compact' && !isInLatestExchange) return null

  return (
    <Answer isCallShown={!!capability} data-testid="scribe-answer">
      {canRetry && (
        <Button
          size="small"
          variant="secondary"
          className="u-mt-half"
          label={t('scribe.retry')}
          onClick={handleRetry}
        />
      )}
      {canAct && (
        <div className="u-flex u-flex-items-center u-flex-wrap">
          <ScribeCopyButton text={text} />
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
          isPast={isPast}
        />
      )}
    </Answer>
  )
}
