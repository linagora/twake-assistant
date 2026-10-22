import { render } from '@testing-library/react'
import React from 'react'

import { ScribeLoader } from '@/components/Scribe/ScribeLoader'

const mockLottie = jest.fn(() => <div data-testid="scribe-loader" />)

jest.mock('lottie-react', () => ({
  __esModule: true,
  default: props => mockLottie(props)
}))

function mockReducedMotion(isReduced) {
  window.matchMedia = jest.fn(query => ({
    matches: isReduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addListener: jest.fn(),
    removeListener: jest.fn()
  }))
}

describe('ScribeLoader', () => {
  afterEach(() => {
    delete window.matchMedia
    mockLottie.mockClear()
  })

  it('plays the animation in a loop', () => {
    mockReducedMotion(false)

    render(<ScribeLoader size={20} />)

    expect(mockLottie).toHaveBeenLastCalledWith(
      expect.objectContaining({ loop: true, autoplay: true })
    )
  })

  it('holds its first frame when the user asks for reduced motion', () => {
    mockReducedMotion(true)

    render(<ScribeLoader size={20} />)

    expect(mockLottie).toHaveBeenLastCalledWith(
      expect.objectContaining({ loop: false, autoplay: false })
    )
  })
})
