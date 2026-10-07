import React, { useEffect, useState } from 'react'

import { Check } from '@linagora/twake-icons'
import Button from 'cozy-ui/transpiled/react/Buttons'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'

function getParamNames(capability, params) {
  const names = Object.keys(capability.action.parameters?.properties ?? {})
  return [
    ...names,
    ...Object.keys(params).filter(name => !names.includes(name))
  ]
}

function ParamValue({ name, value }) {
  if (Array.isArray(value)) {
    const items = value.filter(item => typeof item === 'string' && item !== '')
    if (items.length === 0) return null

    return (
      <ul className={styles['scribe-capability-list']}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    )
  }
  if (typeof value !== 'string' || value === '') return null

  return name === 'title' ? (
    <Typography className={styles['scribe-capability-title']}>
      {value}
    </Typography>
  ) : (
    <Typography className="u-mt-half">{value}</Typography>
  )
}

/**
 * A call of a capability the LLM proposes, handed to the app on the click of
 * the user, or at once when the capability needs no confirmation
 */
export function ScribeCapabilityCard({ messageId, capability, params, text }) {
  const { t } = useI18n()
  const { handCall, isCallHanded } = useScribe()
  const [isDone, setIsDone] = useState(() => isCallHanded(messageId))

  const hand = () => {
    handCall(messageId, () => capability.onClick(params, text))
    setIsDone(true)
  }

  useEffect(() => {
    if (!capability.confirm) hand()
    // Once, when the card mounts: handCall keeps a card that mounts again from
    // handing the call twice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={styles['scribe-capability']}
      data-testid="scribe-capability"
    >
      {getParamNames(capability, params).map(name => (
        <ParamValue key={name} name={name} value={params[name]} />
      ))}
      {isDone ? (
        <div role="status" className={styles['scribe-capability-done']}>
          <Check width={16} height={16} aria-hidden="true" />
          <Typography
            variant="body2"
            color="textSecondary"
            className="u-ml-half"
          >
            {t('scribe.capabilities.done')}
          </Typography>
        </div>
      ) : (
        <Button
          size="small"
          className="u-mt-half"
          label={capability.label}
          onClick={hand}
        />
      )}
    </div>
  )
}
