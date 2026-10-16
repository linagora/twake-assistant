import {
  useMessage,
  useMessageRuntime,
  useThreadRuntime
} from '@assistant-ui/react'
import React from 'react'

import Button from 'cozy-ui/transpiled/react/Buttons'
import { useI18n } from 'twake-i18n'

import { Answer, getText } from '@/components/Messages/Answer'
import { ScribeCapabilityCard } from '@/components/Scribe/ScribeCapabilityCard'
import { useScribe } from '@/components/Scribe/ScribeProvider'

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
 * is complete
 */
export function ScribeAnswer() {
  const { t } = useI18n()
  const { answerActions, capabilities } = useScribe()
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
          isPast={isPast}
        />
      )}
    </Answer>
  )
}
