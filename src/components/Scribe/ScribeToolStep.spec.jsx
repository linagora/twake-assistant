import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { ScribeToolStep } from '@/components/Scribe/ScribeToolStep'
import en from '@/locales/en.json'

const STEPS = [
  {
    label: 'I search the emails.',
    tool: 'search_emails',
    details: ['text: Atelier Rhône']
  },
  { label: 'I read the email.', tool: 'get_email_details', details: ['id: 2'] }
]

function renderSteps(steps) {
  return render(
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <ScribeToolStep steps={steps} />
    </I18n>
  )
}

describe('ScribeToolStep', () => {
  it('shows the last step only, as a status', () => {
    renderSteps(STEPS)

    expect(screen.getByRole('status').textContent).toBe('I read the email.')
    expect(screen.queryByRole('listitem')).toBe(null)
  })

  it('unfolds all the steps, in their order, with their tools, and counts them', () => {
    renderSteps(STEPS)

    fireEvent.click(screen.getByRole('button', { name: 'I read the email.' }))

    const toggle = screen.getByRole('button', { name: '2 steps' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(
      screen.getAllByRole('listitem').map(item => item.textContent)
    ).toEqual([
      'I search the emails.search_emails · text: Atelier Rhône',
      'I read the email.get_email_details · id: 2'
    ])

    fireEvent.click(toggle)

    expect(
      screen
        .getByRole('button', { name: 'I read the email.' })
        .getAttribute('aria-expanded')
    ).toBe('false')
  })

  it('has the arrow for one step too, to show its tool', () => {
    renderSteps(STEPS.slice(0, 1))

    fireEvent.click(screen.getByRole('button', { name: 'I search the emails.' }))

    expect(screen.getByRole('button', { name: '1 step' })).toBeInTheDocument()
    expect(
      screen.getByText('search_emails · text: Atelier Rhône')
    ).toBeInTheDocument()
  })

  it('names the tool once for a step without reason, as in a past conversation', () => {
    renderSteps([
      { label: 'list_emails', tool: 'list_emails', details: [] },
      { label: 'get_email_details', tool: 'get_email_details', details: ['id: 2'] }
    ])

    fireEvent.click(screen.getByRole('button', { name: 'get_email_details' }))

    expect(
      screen.getAllByRole('listitem').map(item => item.textContent)
    ).toEqual(['list_emails', 'get_email_detailsid: 2'])
  })
})
