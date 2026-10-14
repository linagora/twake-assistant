import { render } from '@testing-library/react'
import React from 'react'

import {
  useVisualViewportHeight,
  VISUAL_VIEWPORT_HEIGHT
} from './useVisualViewportHeight'

const App = () => {
  useVisualViewportHeight()
  return null
}

describe('useVisualViewportHeight', () => {
  let listeners

  beforeEach(() => {
    listeners = {}
    window.visualViewport = {
      height: 844,
      offsetTop: 0,
      addEventListener: (name, fn) => (listeners[name] = fn),
      removeEventListener: name => delete listeners[name]
    }
    window.scrollTo = jest.fn()
  })

  afterEach(() => {
    delete window.visualViewport
  })

  const getHeight = () =>
    document.documentElement.style.getPropertyValue(VISUAL_VIEWPORT_HEIGHT)

  it('sizes the document to the visible viewport, and follows the keyboard', () => {
    const { unmount } = render(<App />)
    expect(getHeight()).toBe('844px')

    window.visualViewport.height = 444.6
    window.visualViewport.offsetTop = 300
    listeners.resize()

    expect(getHeight()).toBe('445px')
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)

    unmount()
    expect(getHeight()).toBe('')
    expect(listeners).toEqual({})
  })
})
