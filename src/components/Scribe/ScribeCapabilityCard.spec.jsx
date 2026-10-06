import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { I18n, initTranslation } from 'twake-i18n'

import { ScribeCapabilityCard } from '@/components/Scribe/ScribeCapabilityCard'
import { useScribe } from '@/components/Scribe/ScribeProvider'
import en from '@/locales/en.json'

jest.mock('@/components/Scribe/ScribeProvider', () => ({
  useScribe: jest.fn()
}))

const capability = {
  name: 'insert_slide',
  label: 'Insert the slide',
  confirm: true,
  action: {
    name: 'insert_slide',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        bullets: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  onClick: jest.fn()
}

// The scribe hands a call once per message, as the provider does
function makeScribe() {
  const handed = new Set()
  return {
    handCall: (messageId, hand) => {
      if (handed.has(messageId)) return
      handed.add(messageId)
      hand()
    },
    isCallHanded: messageId => handed.has(messageId)
  }
}

function renderCard(params, props = {}) {
  const tree = () => (
    <I18n lang="en" polyglot={initTranslation('en', () => en)}>
      <ScribeCapabilityCard
        messageId="a1"
        capability={capability}
        params={params}
        text=""
        {...props}
      />
    </I18n>
  )
  const result = render(tree())
  return { ...result, rerender: () => result.rerender(tree()) }
}

describe('ScribeCapabilityCard', () => {
  beforeEach(() => {
    capability.onClick.mockClear()
    useScribe.mockReturnValue(makeScribe())
  })

  it('shows the params the LLM filled', () => {
    renderCard({ title: 'Risks', bullets: ['Delay', 'Budget'] })

    expect(screen.queryByText('Risks')).toBeInTheDocument()
    expect(
      screen.getAllByRole('listitem').map(item => item.textContent)
    ).toEqual(['Delay', 'Budget'])
  })

  it('leaves out an empty param', () => {
    renderCard({ title: '', bullets: [] })

    expect(screen.queryByRole('list')).toBe(null)
    expect(
      screen.queryByRole('button', { name: 'Insert the slide' })
    ).toBeInTheDocument()
  })

  it('hands the call to the app once the user confirms it, then says it is done', () => {
    const params = { title: 'Risks', bullets: ['Delay'] }
    renderCard(params)

    fireEvent.click(screen.getByRole('button', { name: 'Insert the slide' }))

    expect(capability.onClick).toHaveBeenCalledWith(params, '')
    expect(screen.queryByRole('button')).toBe(null)
    expect(screen.getByRole('status').textContent).toBe('Done')
  })

  it('hands the content the assistant wrote with the call', () => {
    renderCard({ title: 'Report' }, { text: '# Report\n\nAll is well.' })

    fireEvent.click(screen.getByRole('button', { name: 'Insert the slide' }))

    expect(capability.onClick).toHaveBeenCalledWith(
      { title: 'Report' },
      '# Report\n\nAll is well.'
    )
  })

  it('hands the call at once, and once, when the app does not ask for a confirmation', () => {
    const params = { title: 'Risks', bullets: ['Delay'] }
    const { rerender, unmount } = renderCard(params, {
      capability: { ...capability, confirm: false }
    })

    expect(capability.onClick).toHaveBeenCalledTimes(1)
    expect(capability.onClick).toHaveBeenCalledWith(params, '')
    expect(screen.queryByRole('button')).toBe(null)
    expect(screen.getByRole('status').textContent).toBe('Done')

    rerender()
    unmount()
    renderCard(params, { capability: { ...capability, confirm: false } })

    expect(capability.onClick).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toBe('Done')
  })
})
