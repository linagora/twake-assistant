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

// The tool a step calls and the params it fills, as the LLM wrote them: the
// tool once only, when the step has no reason and its line is the tool
function StepTool({ label, tool, details }) {
  const parts = label === tool ? details : [tool, ...details]
  if (parts.length === 0) return null

  return (
    <Typography
      variant="caption"
      color="textSecondary"
      component="p"
      className={styles['scribe-tool-call']}
    >
      {parts.join(' · ')}
    </Typography>
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

  return (
    <div className={styles['scribe-tool-step']} data-testid="scribe-tool-step">
      {/* A status: a screen reader tells each new step */}
      <div role="status">
        <ButtonBase
          aria-expanded={isOpen}
          onClick={() => setIsOpen(value => !value)}
          className={styles['scribe-tool-toggle']}
        >
          {/* Unfolded, the list tells each step: the line counts them */}
          {isOpen ? (
            <Typography variant="body2" color="textSecondary" component="span">
              {t('scribe.capabilities.steps', { smart_count: steps.length })}
            </Typography>
          ) : (
            <StepLine label={last.label} />
          )}
          <Icon
            icon={Right}
            size={12}
            rotate={isOpen ? 90 : 0}
            className="u-ml-half"
          />
        </ButtonBase>
      </div>
      <Collapse in={isOpen} mountOnEnter unmountOnExit>
        <ol className={styles['scribe-tool-history']}>
          {steps.map((step, index) => (
            <li key={index}>
              <StepLine label={step.label} />
              <StepTool
                label={step.label}
                tool={step.tool}
                details={step.details}
              />
            </li>
          ))}
        </ol>
      </Collapse>
    </div>
  )
}
