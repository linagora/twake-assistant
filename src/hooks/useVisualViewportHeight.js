import { useEffect } from 'react'

export const VISUAL_VIEWPORT_HEIGHT = '--visual-viewport-height'

/**
 * Keeps the height of what the user sees in a CSS variable on the document,
 * for the heights of the app. The keyboard of a phone covers the page
 * instead of shrinking it (always on iOS, on Android unless the viewport
 * meta asks otherwise): the composer at the bottom of the app would be
 * hidden under it. The browser then scrolls the page to show the input;
 * the app being sized to the visible part, it is brought back to its top.
 */
export const useVisualViewportHeight = () => {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return undefined

    const update = () => {
      document.documentElement.style.setProperty(
        VISUAL_VIEWPORT_HEIGHT,
        `${Math.round(viewport.height)}px`
      )
      if (viewport.offsetTop > 0 || window.scrollY > 0) {
        window.scrollTo(0, 0)
      }
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      document.documentElement.style.removeProperty(VISUAL_VIEWPORT_HEIGHT)
    }
  }, [])
}
