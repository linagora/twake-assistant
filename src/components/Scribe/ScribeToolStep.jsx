import React, { useState } from 'react'

import { Check, Icon, Right } from '@linagora/twake-icons'
import ButtonBase from 'cozy-ui/transpiled/react/ButtonBase'
import Collapse from 'cozy-ui/transpiled/react/Collapse'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import styles from '@/components/Scribe/styles.styl'

function StepLine({ label }) {
  return (
    <span className="u-flex u-flex-items-center">
      <Check
        width={14}
        height={14}
        className={styles['scribe-check']}
        aria-hidden="true"
      />
      <Typography
        variant="body2"
        color="textSecondary"
        component="span"
        className="u-ml-half"
      >
        {label}
      </Typography>
    </span>
  )
}

// The tool a step calls and the params it fills, as the LLM wrote them
function getToolText({ tool, details }) {
  return [tool, ...details].join(' · ')
}

function StepTool({ step }) {
  return (
    <Typography
      variant="caption"
      color="textSecondary"
      component="p"
      className={styles['scribe-tool-call']}
    >
      {getToolText(step)}
    </Typography>
  )
}

// In the unfolded list, a step without label is its tool and params alone
function StepItem({ step }) {
  if (step.label === null) return <StepLine label={getToolText(step)} />

  return (
    <>
      <StepLine label={step.label} />
      <StepTool step={step} />
    </>
  )
}

/**
 * The steps of the reasoning of the LLM, the calls it makes one after the
 * other, as one line that tells the last one: its arrow unfolds them all, in
 * their order, each with the tool it calls and its params, and the line then
 * counts them
 *
 * @param {object} props
 * @param {import('@/lib/scribe').ScribeStep[]} props.steps - at least one
 */
export function ScribeToolStep({ steps }) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const last = steps[steps.length - 1]
  const count = t('scribe.capabilities.steps', { smart_count: steps.length })
  // Without label, the line counts the steps, as unfolded
  const lastLine = last.label ?? count

  return (
    <div className={styles['scribe-tool-step']} data-testid="scribe-tool-step">
      {/* Apart from the toggle: a screen reader tells each new step, and not
          the line that changes as the user unfolds the steps */}
      <span role="status" className="u-visuallyhidden">
        {lastLine}
      </span>
      <ButtonBase
        aria-expanded={isOpen}
        onClick={() => setIsOpen(value => !value)}
        className={styles['scribe-tool-toggle']}
      >
        {isOpen ? (
          <Typography variant="body2" color="textSecondary" component="span">
            {count}
          </Typography>
        ) : (
          <StepLine label={lastLine} />
        )}
        <Icon
          icon={Right}
          size={12}
          rotate={isOpen ? 90 : 0}
          className="u-ml-half"
        />
      </ButtonBase>
      <Collapse in={isOpen} mountOnEnter unmountOnExit>
        <ol className={styles['scribe-tool-history']}>
          {steps.map((step, index) => (
            <li key={index}>
              <StepItem step={step} />
            </li>
          ))}
        </ol>
      </Collapse>
    </div>
  )
}
