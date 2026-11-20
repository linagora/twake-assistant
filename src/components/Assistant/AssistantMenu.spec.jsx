import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import AssistantMenu from './AssistantMenu'

jest.mock('cozy-client', () => ({
  Q: jest.fn(),
  fetchPolicies: { olderThan: () => null },
  useQuery: () => ({
    data: [
      { _id: 'drive', name: 'My Drive' },
      { _id: 'projects', name: 'Projects' }
    ]
  })
}))
jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const useBreakpoints = () => ({ isMobile: false })
  return { __esModule: true, default: useBreakpoints, useBreakpoints }
})
jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key, options) => (options?.name ? `${key} ${options.name}` : key)
  })
}))
jest.mock('../AssistantProvider', () => ({
  useAssistant: () => ({
    selectedAssistantId: 'projects',
    setIsOpenCreateAssistant: jest.fn(),
    setAssistantIdInAction: jest.fn(),
    setIsOpenDeleteAssistant: jest.fn(),
    setIsOpenEditAssistant: jest.fn(),
    setSelectedAssistantId: jest.fn()
  })
}))
jest.mock('../KnowledgeBase/useDefaultAssistantId', () => ({
  useDefaultAssistantId: () => null
}))

const setup = () => {
  const anchorRef = { current: document.body }
  render(<AssistantMenu anchorRef={anchorRef} open onClose={jest.fn()} />)
}

describe('AssistantMenu', () => {
  it('opens with the focus on the selected assistant', () => {
    setup()
    const projects = screen.getByRole('menuitemradio', { name: 'Projects' })

    expect(projects.getAttribute('aria-checked')).toBe('true')
    expect(document.activeElement).toBe(projects)
    expect(
      screen
        .getByRole('menuitemradio', { name: 'My Drive' })
        .getAttribute('aria-checked')
    ).toBe('false')
  })

  it('moves the focus to the actions of the item with the arrows', () => {
    setup()
    const projects = screen.getByRole('menuitemradio', { name: 'Projects' })

    fireEvent.keyDown(projects, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(
      screen.getByRole('button', {
        name: 'assistant_edit.label Projects',
        hidden: true
      })
    )

    fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(
      screen.getByRole('button', {
        name: 'assistant_delete.label Projects',
        hidden: true
      })
    )

    fireEvent.keyDown(document.activeElement, { key: 'ArrowLeft' })
    fireEvent.keyDown(document.activeElement, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(projects)
  })
})
