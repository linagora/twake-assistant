import { MessagePrimitive, useMessage } from '@assistant-ui/react'
import React, { useState } from 'react'

import { Icon, Right } from '@linagora/twake-icons'
import Alert from 'cozy-ui/transpiled/react/Alert'
import ButtonBase from 'cozy-ui/transpiled/react/ButtonBase'
import Collapse from 'cozy-ui/transpiled/react/Collapse'
import Markdown from 'cozy-ui/transpiled/react/Markdown'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { Sources } from '@/components/Messages/Sources'
import styles from '@/components/Messages/styles.styl'

function getPartText(message, type) {
  return message.content
    .filter(part => part.type === type)
    .map(part => part.text)
    .join('')
}

export const getText = message => getPartText(message, 'text')
export const getErrorKind = message =>
  message.metadata?.custom?.error?.kind ?? 'generic'
const getReasoning = message => getPartText(message, 'reasoning')

function ThinkingDots() {
  return (
    <div className={styles['thinking-dots']}>
      <span className={styles['thinking-dot']} />
      <span className={styles['thinking-dot']} />
      <span className={styles['thinking-dot']} />
    </div>
  )
}

function AnswerWaiting({ label, indicator }) {
  return (
    <div role="status" className="u-flex u-flex-items-center">
      {indicator}
      <Typography
        variant="body2"
        color="textSecondary"
        component="span"
        className="u-ml-half"
      >
        {label}
      </Typography>
    </div>
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
      {/* A status, as the dots it replaces: its label tells when the model
      has done thinking */}
      <div role="status">
        <ButtonBase aria-expanded={isOpen} onClick={handleToggle}>
          <Typography
            variant="body2"
            color="textSecondary"
            component="span"
            className="u-flex u-flex-items-center"
          >
            {t(isRunning ? 'chat.reasoning.running' : 'chat.reasoning.done')}
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
 * An answer of the LLM, the same in the assistant and in the scribe. A view
 * adds its own actions as children.
 *
 * @param {object} props
 * @param {boolean} [props.isCallShown] - whether the view shows the call of
 * the app the LLM proposes: an answer with only such a call is empty
 * otherwise
 * @param {import('react').ReactNode} [props.content] - what the view shows
 * of the text, in place of its Markdown
 * @param {string} [props.waitingLabel] - what the view says it does until
 * the answer comes
 * @param {import('react').ReactNode} [props.waitingIndicator] - what the
 * view shows beside it
 */
export function Answer({
  isCallShown = false,
  content = null,
  waitingLabel,
  waitingIndicator = <ThinkingDots />,
  children,
  ...props
}) {
  const { t } = useI18n()
  const text = useMessage(getText)
  const reasoning = useMessage(getReasoning)
  const status = useMessage(message => message.status?.type)
  const isError = useMessage(
    message => message.metadata?.custom?.isError === true
  )
  const isAssistantGone = useMessage(
    message => message.metadata?.custom?.isAssistantGone === true
  )
  const errorKind = useMessage(getErrorKind)
  const sources = useMessage(message => message.metadata?.custom?.sources)
  const hasCall = useMessage(message => !!message.metadata?.custom?.action)
  const isEmpty =
    useMessage(message => message.metadata?.custom?.isEmpty === true) ||
    (status === 'complete' && text === '' && hasCall && !isCallShown)

  const isWaiting = status === 'running' && text === ''
  // A model may think only blanks: nothing to show then
  const hasReasoning = reasoning.trim() !== ''

  return (
    <MessagePrimitive.Root
      {...props}
      className={`u-mt-1-half ${styles['answer']}`}
    >
      {isWaiting && !hasReasoning && (
        <AnswerWaiting
          label={waitingLabel ?? t('chat.thinking')}
          indicator={waitingIndicator}
        />
      )}
      {hasReasoning && (
        <AnswerReasoning reasoning={reasoning} isRunning={isWaiting} />
      )}
      {text !== '' && (content ?? <Markdown content={text} />)}
      {isError && (
        <Alert severity="error">
          {t(
            isAssistantGone ? 'chat.assistant_gone' : `chat.errors.${errorKind}`
          )}
        </Alert>
      )}
      {isEmpty && (
        <Typography color="textSecondary">
          {t('chat.errors.empty_response')}
        </Typography>
      )}
      {!isEmpty && sources?.length > 0 && <Sources sources={sources} />}
      {children}
    </MessagePrimitive.Root>
  )
}
