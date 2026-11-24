import { render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import AssistantDialogContent from './AssistantDialogContent'
import { getSelectedProviderById } from './helpers'
import { STEPS } from './useAssistantDialog'

import en from '@/locales/en.json'

jest.mock('./BasicInfoStep', () => () => null)
jest.mock('./ProviderSelectionStep', () => () => null)
jest.mock('./ApiKeyStep', () => () => null)

const renderContent = (step, selectedProvider) =>
  render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <AssistantDialogContent
        step={step}
        formData={{}}
        selectedProvider={selectedProvider}
        onChange={() => () => {}}
      />
    </I18n>
  )

describe('AssistantDialogContent', () => {
  it('counts two steps with Twake', () => {
    renderContent(STEPS.MODEL_SELECTION, getSelectedProviderById('openrag'))

    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
  })

  it('counts two steps while no provider is known', () => {
    renderContent(STEPS.BASIC_INFO, null)

    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
  })

  it('counts the API key step of another provider', () => {
    renderContent(STEPS.API_KEY, getSelectedProviderById('openai'))

    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
  })
})
