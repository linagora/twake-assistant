import { fireEvent, render, screen } from '@testing-library/react'
import React, { useState } from 'react'

import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { I18n, initTranslation } from 'twake-i18n'

import BasicInfoStep from './BasicInfoStep'

import en from '@/locales/en.json'

jest.mock('../KnowledgeBase/KnowledgeBaseSection', () => () => null)

const NameField = () => {
  const [name, setName] = useState('')
  return (
    <BasicInfoStep
      name={name}
      prompt=""
      onChange={() => event => setName(event.target.value)}
    />
  )
}

const renderStep = children =>
  render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <BreakpointsProvider>{children}</BreakpointsProvider>
    </I18n>
  )

describe('BasicInfoStep', () => {
  it('names the fields after their captions', () => {
    renderStep(<BasicInfoStep name="" prompt="" onChange={() => () => {}} />)

    const name = screen.getByRole('textbox', { name: 'Name' })
    expect(name.getAttribute('aria-required')).toBe('true')
    expect(screen.getByText('*')).toBeInTheDocument()
    expect(screen.getByLabelText('Instructions')).toBeInTheDocument()
  })

  it('asks for a name when the field is left empty', () => {
    renderStep(<NameField />)
    const name = screen.getByRole('textbox', { name: 'Name' })

    fireEvent.blur(name)

    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(name).toHaveAccessibleDescription('Enter a name to continue')

    fireEvent.change(name, { target: { value: 'Cook' } })

    expect(screen.queryByText('Enter a name to continue')).toBe(null)
    expect(name.getAttribute('aria-invalid')).toBe('false')
  })
})
