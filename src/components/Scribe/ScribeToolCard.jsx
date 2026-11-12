import React, { useEffect, useState } from 'react'

import { Check } from '@linagora/twake-icons'
import Button from 'cozy-ui/transpiled/react/Buttons'
import Markdown from 'cozy-ui/transpiled/react/Markdown'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'

function getParamNames(tool, params) {
  const names = Object.keys(tool.action.parameters?.properties ?? {})
  return [
    ...names,
    ...Object.keys(params).filter(name => !names.includes(name))
  ]
}

function getParamTitle(tool, name) {
  const title = tool.action.parameters?.properties?.[name]?.title
  return typeof title === 'string' && title.trim() !== '' ? title : null
}

function TitledParam({ title, value }) {
  const { t } = useI18n()
  const text = Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item !== '').join(', ')
    : getParamText(value, t)
  if (text === null || text === '') return null

  return (
    <dl className="u-flex u-m-0 u-mt-half">
      <dt className="u-w-4 u-flex-shrink-0">
        <Typography variant="body2" color="textSecondary" component="span">
          {title}
        </Typography>
      </dt>
      <dd className="u-m-0 u-ov-hidden u-breakword">
        {typeof value === 'string' ? (
          <Markdown content={text} />
        ) : (
          <Typography component="span">{text}</Typography>
        )}
      </dd>
    </dl>
  )
}

function getParamText(value, t) {
  if (typeof value === 'string') return value === '' ? null : value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') {
    return t(value ? 'scribe.tools.yes' : 'scribe.tools.no')
  }
  return null
}

function ParamValue({ name, value }) {
  const { t } = useI18n()
  if (Array.isArray(value)) {
    const items = value.filter(item => typeof item === 'string' && item !== '')
    if (items.length === 0) return null

    return (
      <ul className={styles['scribe-tool-list']}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
  }
  const text = getParamText(value, t)
  if (text === null) return null

  return name === 'title' ? (
    <Typography className={styles['scribe-tool-title']}>{text}</Typography>
  ) : (
    <Typography className="u-mt-half">{text}</Typography>
  )
}

/**
 * A call of a tool the LLM proposes, handed to the app on the click of
 * the user, or at once when the tool needs no confirmation. A call of a
 * past conversation waits for the click: it was made on another text.
 */
export function ScribeToolCard({
  messageId,
  tool,
  params,
  text,
  callId = null,
  isPast = false
}) {
  const { t } = useI18n()
  const { handCall, isCallHanded } = useScribe()
  const [isDone, setIsDone] = useState(() => isCallHanded(messageId))

  const hand = () => {
    handCall(messageId, () => tool.onClick(params, text, callId), callId)
    setIsDone(true)
  }

  useEffect(() => {
    if (!tool.confirm && !isPast) hand()
    // Once, when the card mounts: handCall keeps a card that mounts again from
    // handing the call twice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles['scribe-tool']} data-testid="scribe-tool">
      {getParamNames(tool, params).map(name => {
        const title = getParamTitle(tool, name)
        return title === null ? (
          <ParamValue key={name} name={name} value={params[name]} />
        ) : (
          <TitledParam key={name} title={title} value={params[name]} />
        )
      })}
      {isDone ? (
        <div role="status" className={styles['scribe-tool-done']}>
          <Check width={16} height={16} aria-hidden="true" />
          <Typography
            variant="body2"
            color="textSecondary"
            className="u-ml-half"
          >
            {t('scribe.tools.done')}
          </Typography>
        </div>
      ) : (
        <Button
          size="small"
          className="u-mt-half"
          label={tool.label}
          onClick={hand}
        />
      )}
    </div>
  )
}
