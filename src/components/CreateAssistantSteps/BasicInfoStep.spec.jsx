import { render, screen } from '@testing-library/react'
import React from 'react'

import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { I18n, initTranslation } from 'twake-i18n'

import BasicInfoStep from './BasicInfoStep'

import en from '@/locales/en.json'

jest.mock('../KnowledgeBase/KnowledgeBaseSection', () => () => null)

describe('BasicInfoStep', () => {
  it('names the fields after their captions', () => {
    render(
      <I18n lang="en" polyglot={initTranslation('en', () => en)}>
        <BreakpointsProvider>
          <BasicInfoStep name="" prompt="" onChange={() => () => {}} />
        </BreakpointsProvider>
      </I18n>
    )

    expect(screen.getByLabelText('Name').getAttribute('aria-required')).toBe(
      'true'
    )
    expect(screen.getByLabelText('Instructions')).toBeInTheDocument()
  })
})
