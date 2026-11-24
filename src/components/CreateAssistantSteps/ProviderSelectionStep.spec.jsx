import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import ProviderSelectionStep from './ProviderSelectionStep'
import providers from './providers.json'

jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const useBreakpoints = () => ({ isMobile: false })
  return { __esModule: true, default: useBreakpoints, useBreakpoints }
})
jest.mock('cozy-ui-plus/dist/providers/CozyTheme', () => ({
  useCozyTheme: () => ({ type: 'light' })
}))
jest.mock('twake-i18n', () => ({
  useI18n: () => ({ t: key => key })
}))

const setup = selectedProvider => {
  const onSelect = jest.fn()
  render(
    <ProviderSelectionStep
      selectedProvider={selectedProvider}
      onSelect={onSelect}
    />
  )
  return onSelect
}

describe('ProviderSelectionStep', () => {
  it('is a single choice with only the chosen card in the tab order', () => {
    setup(providers[1])

    expect(
      screen.getByRole('radiogroup', {
        name: 'assistant_create.steps.provider_selection.description'
      })
    ).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios.map(radio => radio.getAttribute('aria-checked'))).toEqual(
      providers.map((_, index) => String(index === 1))
    )
    expect(radios.map(radio => radio.tabIndex)).toEqual(
      providers.map((_, index) => (index === 1 ? 0 : -1))
    )
  })

  it('puts the first card in the tab order until one is chosen', () => {
    setup(null)

    expect(screen.getAllByRole('radio')[0].tabIndex).toBe(0)
  })

  it('chooses the next and previous cards with the arrows, looping', () => {
    const onSelect = setup(providers[0])
    const radios = screen.getAllByRole('radio')

    fireEvent.keyDown(radios[0], { key: 'ArrowDown' })
    expect(onSelect).toHaveBeenLastCalledWith(providers[1])
    expect(radios[1]).toHaveFocus()

    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' })
    expect(onSelect).toHaveBeenLastCalledWith(providers[providers.length - 1])
    expect(radios[providers.length - 1]).toHaveFocus()
  })
})
