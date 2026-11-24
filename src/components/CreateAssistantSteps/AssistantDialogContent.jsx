import React from 'react'

import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { OPENRAG_MODEL } from '../constants'
import ApiKeyStep from './ApiKeyStep'
import BasicInfoStep from './BasicInfoStep'
import ProviderSelectionStep from './ProviderSelectionStep'
import { STEPS } from './useAssistantDialog'

const StepContent = ({
  step,
  formData,
  selectedProvider,
  onChange,
  onAvatarChange,
  onProviderSelect,
  onModelSelect
}) => {
  switch (step) {
    case STEPS.BASIC_INFO:
      return (
        <BasicInfoStep
          name={formData.name}
          prompt={formData.prompt}
          icon={formData.icon}
          knowledgeBase={formData.knowledgeBase}
          onChange={onChange}
          onAvatarChange={onAvatarChange}
          onKnowledgeBaseChange={onChange('knowledgeBase')}
        />
      )
    case STEPS.MODEL_SELECTION:
      return (
        <ProviderSelectionStep
          selectedProvider={selectedProvider}
          onSelect={onProviderSelect}
        />
      )
    case STEPS.API_KEY:
      return (
        <ApiKeyStep
          formData={formData}
          selectedProvider={selectedProvider}
          onChange={onChange}
          onModelSelect={onModelSelect}
        />
      )
    default:
      return null
  }
}

const AssistantDialogContent = props => {
  const { t } = useI18n()
  const { step, selectedProvider } = props
  // Only a provider other than Twake needs the API key step
  const total =
    selectedProvider && selectedProvider.id !== OPENRAG_MODEL ? 3 : 2

  return (
    <>
      <Typography
        variant="caption"
        component="p"
        className="u-mb-1 u-c-text-secondary"
      >
        {t('assistant_create.step', { current: step + 1, total })}
      </Typography>
      <StepContent {...props} />
    </>
  )
}

export default AssistantDialogContent
