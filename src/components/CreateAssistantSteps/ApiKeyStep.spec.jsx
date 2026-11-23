import { render, screen } from '@testing-library/react'
import React from 'react'

import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { I18n, initTranslation } from 'twake-i18n'

import ApiKeyStep from './ApiKeyStep'
import { getSelectedProviderById } from './helpers'

import en from '@/locales/en.json'

const setup = ({ providerId = 'openai', formData = {} } = {}) =>
  render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <BreakpointsProvider>
        <ApiKeyStep
          formData={formData}
          selectedProvider={getSelectedProviderById(providerId)}
          onChange={() => () => {}}
        />
      </BreakpointsProvider>
    </I18n>
  )

describe('ApiKeyStep', () => {
  it('names the fields after their captions and marks them required', () => {
    setup({ providerId: 'custom' })

    for (const label of ['Base URL', 'Model', 'API Key']) {
      expect(screen.getByLabelText(label).getAttribute('aria-required')).toBe(
        'true'
      )
    }
  })

  it('does not require the API key of an assistant that has one', () => {
    setup({ formData: { encryptedApiKey: 'encrypted' } })

    expect(screen.getByLabelText('API Key').getAttribute('aria-required')).toBe(
      null
    )
  })

  it('suggests a supported model', () => {
    setup({ formData: { model: 'o1' } })

    expect(
      screen
        .getByRole('textbox', { name: 'Model' })
        .getAttribute('aria-invalid')
    ).toBe('true')
    expect(
      screen.queryByText(/This model is not supported yet\. Try gpt-/)
    ).toBeInTheDocument()
  })

  it.each(['not a url', 'javascript:alert(1)'])(
    'shows an error for the base url %s',
    baseUrl => {
      setup({ providerId: 'custom', formData: { baseUrl } })

      expect(
        screen.getByLabelText('Base URL').getAttribute('aria-invalid')
      ).toBe('true')
      expect(screen.queryByText('Enter an http(s) URL.')).toBeInTheDocument()
    }
  )

  it.each(['', 'https://api.example.com/v1'])(
    'shows no error for the base url "%s"',
    baseUrl => {
      setup({ providerId: 'custom', formData: { baseUrl } })

      expect(screen.queryByText('Enter an http(s) URL.')).toBe(null)
    }
  )
})
