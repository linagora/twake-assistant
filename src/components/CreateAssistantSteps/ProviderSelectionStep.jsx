import cx from 'classnames'
import React, { useId } from 'react'

import Alert from 'cozy-ui/transpiled/react/Alert'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useBreakpoints } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { useI18n } from 'twake-i18n'

import Provider from './Provider'
import providers from './providers.json'
import styles from './styles.styl'

const ARROW_STEPS = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }

const ProviderSelectionStep = ({ selectedProvider, onSelect }) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const descriptionId = useId()
  const selectedIndex = providers.findIndex(
    provider => provider.id === selectedProvider?.id
  )
  // A single choice: only the chosen card is in the tab order, the first one
  // until one is chosen
  const focusableIndex = Math.max(selectedIndex, 0)

  // The arrows choose the previous or next card, looping, as in a radio group
  const handleKeyDown = event => {
    const step = ARROW_STEPS[event.key]
    if (!step) return
    event.preventDefault()
    const radios = [...event.currentTarget.querySelectorAll('[role="radio"]')]
    const index =
      (radios.indexOf(event.target) + step + radios.length) % radios.length
    onSelect(providers[index])
    radios[index].focus()
  }

  return (
    <div className={cx('u-flex u-flex-column', styles.ModelSelectionStep)}>
      <Typography
        id={descriptionId}
        variant="body1"
        className="u-mb-1 u-c-text-secondary"
      >
        {t('assistant_create.steps.provider_selection.description')}
      </Typography>
      <div
        role="radiogroup"
        aria-labelledby={descriptionId}
        onKeyDown={handleKeyDown}
        className={cx(styles['grid-container'], {
          [styles['grid-container--mobile']]: isMobile
        })}
      >
        {providers.map((provider, index) => (
          <Provider
            key={provider.id}
            provider={provider}
            selectedProvider={selectedProvider}
            tabIndex={index === focusableIndex ? 0 : -1}
            onSelect={onSelect}
          />
        ))}
      </div>
      {selectedProvider?.external && (
        <Alert severity="primary" className="u-mt-1">
          {t('assistant_create.steps.provider_selection.external_warning')}
        </Alert>
      )}
    </div>
  )
}

export default ProviderSelectionStep
