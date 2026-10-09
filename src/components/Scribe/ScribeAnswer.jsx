import { MessagePrimitive, useMessage } from '@assistant-ui/react'
import React, { useState } from 'react'

import { Icon, Right } from '@linagora/twake-icons'
import Alert from 'cozy-ui/transpiled/react/Alert'
import ButtonBase from 'cozy-ui/transpiled/react/ButtonBase'
import Button from 'cozy-ui/transpiled/react/Buttons'
import Collapse from 'cozy-ui/transpiled/react/Collapse'
import Markdown from 'cozy-ui/transpiled/react/Markdown'
import Spinner from 'cozy-ui/transpiled/react/Spinner'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { ScribeCapabilityCard } from '@/components/Scribe/ScribeCapabilityCard'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeSources } from '@/components/Scribe/ScribeSources'
import styles from '@/components/Scribe/styles.styl'

function getPartText(message, type) {
  return message.content
    .filter(part => part.type === type)
    .map(part => part.text)
    .join('')
}

const getText = message => getPartText(message, 'text')
const getReasoning = message => getPartText(message, 'reasoning')

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
 * What a reasoning model thinks before it answers, folded in a line as other
 * chats show it
 */
function AnswerReasoning({ reasoning, isRunning }) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const lines = reasoning.split('\n').filter(line => line.trim() !== '')

  const handleToggle = () => setIsOpen(value => !value)

  return (
    <div className="u-mb-1">
      {/* A status, as the spinner it replaces: its label tells when the
      model has done thinking */}
      <div role="status">
        <ButtonBase aria-expanded={isOpen} onClick={handleToggle}>
          <Typography
            variant="body2"
            color="textSecondary"
            component="span"
            className="u-flex u-flex-items-center"
          >
            {t(
              isRunning ? 'scribe.reasoning.running' : 'scribe.reasoning.done'
            )}
            <Icon
              icon={Right}
              size={12}
              rotate={isOpen ? 90 : 0}
              className="u-ml-half"
            />
          </Typography>
        </ButtonBase>
      </div>
      {/* Set apart so that a table drafted here is not taken for the answer */}
      <Collapse
        in={isOpen}
        mountOnEnter
        unmountOnExit
        className="u-pl-1 u-fs-italic"
      >
        {lines.map((line, index) => (
          <Typography
            key={index}
            variant="body2"
            color="textSecondary"
            className="u-mt-half"
          >
            {line}
          </Typography>
        ))}
      </Collapse>
    </div>
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
  const reasoning = useMessage(getReasoning)
  const status = useMessage(message => message.status?.type)
  const isError = useMessage(
    message => message.metadata?.custom?.isError === true
  )
  const sources = useMessage(message => message.metadata?.custom?.sources)
  const action = useMessage(message => message.metadata?.custom?.action)
  const isPast = useMessage(
    message => message.metadata?.custom?.isPast === true
  )
  const capability =
    action && capabilities.find(capability => capability.name === action.name)
  // A past conversation may hold a call of another app: nothing to show then
  const isEmpty =
    useMessage(message => message.metadata?.custom?.isEmpty === true) ||
    (status === 'complete' && text === '' && !!action && !capability)

  const isWaiting = status === 'running' && text === ''
  // A model may think only blanks: nothing to show then
  const hasReasoning = reasoning.trim() !== ''
  const isThinking = isWaiting && !hasReasoning
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
      {hasReasoning && (
        <AnswerReasoning reasoning={reasoning} isRunning={isWaiting} />
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
          isPast={isPast}
        />
      )}
    </MessagePrimitive.Root>
  )
}
