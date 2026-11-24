import { renderHook } from '@testing-library/react'

import { useDocumentTitle } from './useDocumentTitle'

describe('useDocumentTitle', () => {
  beforeAll(() => {
    document.title = 'Twake Assistant'
  })

  it('puts the title of the view before the name of the app', () => {
    const { rerender, unmount } = renderHook(
      ({ title }) => useDocumentTitle(title),
      { initialProps: { title: 'New conversation' } }
    )
    expect(document.title).toBe('New conversation – Twake Assistant')

    rerender({ title: 'What is the budget for 2026?' })
    expect(document.title).toBe(
      'What is the budget for 2026? – Twake Assistant'
    )

    unmount()
    expect(document.title).toBe('Twake Assistant')
  })

  it('shows the name of the app alone without a title', () => {
    renderHook(() => useDocumentTitle(''))
    expect(document.title).toBe('Twake Assistant')
  })
})
