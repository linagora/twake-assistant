import {
  useAuiState,
  useMessage,
  useMessageRuntime,
  useThread,
  useThreadRuntime
} from '@assistant-ui/react'
import React, { useMemo } from 'react'

import { Check, Icon } from '@linagora/twake-icons'
import Alert from 'cozy-ui/transpiled/react/Alert'
import Button from 'cozy-ui/transpiled/react/Buttons'
import Markdown from 'cozy-ui/transpiled/react/Markdown'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { Answer, getErrorKind, getText } from '@/components/Messages/Answer'
import { ScribeBlockCard } from '@/components/Scribe/ScribeBlockCard'
import { ScribeCapabilityCard } from '@/components/Scribe/ScribeCapabilityCard'
import { ScribeCopyButton } from '@/components/Scribe/ScribeCopyButton'
import { ScribeLoader } from '@/components/Scribe/ScribeLoader'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'
import { useDone } from '@/components/Scribe/useDone'
import { useIsInLatestExchange } from '@/components/Scribe/useLatestExchange'
import { RETRYABLE_KINDS } from '@/lib/chatErrors'
import { showHtmlTables } from '@/lib/htmlTables'
import { findStepGroup, getRunningLabel, getStep } from '@/lib/scribe'
import { hasInsertBlocks, splitAnswerBlocks } from '@/lib/scribeBlocks'

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

function DocumentNotice({ notice }) {
  const { t } = useI18n()

  if (notice === 'truncated') {
    return (
      <Typography
        role="status"
        variant="body2"
        color="textSecondary"
        className="u-mt-1"
      >
        {t('scribe.document.truncated')}
      </Typography>
    )
  }
  if (notice === 'unavailable') {
    return (
      <Alert severity="error" className="u-mt-1">
        {t('scribe.document.unavailable')}
      </Alert>
    )
  }
  return null
}

function ScribeAnswerActions({ text, ...props }) {
  const { answerActions } = useScribe()

  return (
    <div {...props} className="u-flex u-flex-items-center u-flex-wrap">
      <ScribeCopyButton text={text} />
      {answerActions.map(action => (
        <AnswerActionButton key={action.name} action={action} text={text} />
      ))}
    </div>
  )
}

/**
 * An answer of the LLM, with Copy and the buttons of the actions of the app
 * once it is complete, under the whole answer or under each of its insert
 * blocks, shown as cards: in the compact layout, the one of the latest
 * exchange only. Above it, whether the document of the request was cut or
 * could not be read.
 */
export function ScribeAnswer() {
  const { t } = useI18n()
  const { capabilities, layout } = useScribe()
  const isInLatestExchange = useIsInLatestExchange()
  const messageId = useMessage(message => message.id)
  const text = useMessage(getText)
  const status = useMessage(message => message.status?.type)
  const documentNotice = useMessage(
    message => message.metadata?.custom?.documentNotice
  )
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
  const errorKind = useMessage(getErrorKind)
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
  // An answer to the result of a call: the stack takes a result once
  const isAfterResult = useAuiState(
    ({ message, thread }) =>
      thread.messages.find(({ id }) => id === message.parentId)?.role ===
      'assistant'
  )
  const canRetry =
    ((isError && !isAssistantGone && RETRYABLE_KINDS.includes(errorKind)) ||
      hasNoAnswer) &&
    isLast &&
    !isPast &&
    !isAfterResult
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
  // A prompt of the catalogue brings its own instructions, which have no
  // insert blocks: a fence of its answer is not one
  const parentId = useMessage(message => message.parentId)
  const parentPrompt = useThread(
    state =>
      state.messages.find(message => message.id === parentId)?.metadata?.custom
        ?.prompt ?? null
  )
  const parts =
    !parentPrompt && hasInsertBlocks(text) ? splitAnswerBlocks(text) : null
  // Only a whole answer, or a whole block, goes into the document of the app
  const isComplete = status === 'complete'
  const canAct = isComplete && text.trim() !== ''
  // The steps that follow one another show as one line, the one of the first
  const isStep = useMessage(message => getStep(message, capabilities) !== null)
  // A string, not the group: the selector of useThread must return the same
  // value for the same state, and the answer renders again only when its
  // group changes, not on each token of another answer
  const stepGroup = useThread(state => {
    if (!isStep) return null
    const group = findStepGroup(state.messages, messageId, capabilities)
    return group && JSON.stringify(group)
  })
  const steps = useMemo(() => stepGroup && JSON.parse(stepGroup), [stepGroup])

  if (layout === 'compact' && !isInLatestExchange) return null

  const card = capability && isComplete && (
    <ScribeCapabilityCard
      messageId={messageId}
      capability={capability}
      params={action.params ?? {}}
      text={text}
      callId={action.messageId ?? null}
      isPast={isPast}
      steps={steps}
    />
  )

  // A next step: its card stays, to hand its call, and shows nothing: the
  // first one shows them all
  if (steps && !steps.isFirst && text.trim() === '') return card

  return (
    <>
      <DocumentNotice notice={documentNotice} />
      <Answer
        isCallShown={!!capability}
        waitingLabel={getRunningLabel(parentPrompt, t)}
        waitingIndicator={
          <ScribeLoader size={layout === 'compact' ? 40 : 20} />
        }
        content={
          parts?.map((part, index) =>
            part.type === 'block' ? (
              <ScribeBlockCard key={index} text={part.text}>
                {isComplete && part.text.trim() !== '' && (
                  <ScribeAnswerActions text={part.text} />
                )}
              </ScribeBlockCard>
            ) : (
              <Markdown key={index} content={showHtmlTables(part.text)} />
            )
          ) ?? <Markdown content={showHtmlTables(text)} />
        }
        data-testid="scribe-answer"
      >
        {canRetry && (
          <Button
            size="small"
            variant="secondary"
            className="u-mt-half"
            label={t('scribe.retry')}
            onClick={handleRetry}
          />
        )}
        {canAct && !parts && (
          <ScribeAnswerActions text={text} data-scribe-card="answer" />
        )}
        {card}
      </Answer>
    </>
  )
}
