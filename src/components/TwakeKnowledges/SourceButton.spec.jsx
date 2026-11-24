import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React, { useState } from 'react'

import { Globe } from '@linagora/twake-icons'

import SourceButton from './SourceButton'

const Toggle = () => {
  const [isActive, setIsActive] = useState(false)
  return (
    <SourceButton
      icon={Globe}
      label="Web search"
      isActive={isActive}
      aria-pressed={isActive}
      onClick={() => setIsActive(prev => !prev)}
    />
  )
}

describe('SourceButton', () => {
  it('shows its label once active, and keeps the focus when toggled', async () => {
    render(<Toggle />)

    const off = screen.getByRole('button', { name: 'Web search' })
    expect(off).toHaveAttribute('aria-pressed', 'false')
    expect(off).toHaveTextContent('')

    off.focus()
    fireEvent.click(off)

    const on = screen.getByRole('button', { name: 'Web search' })
    expect(on).toHaveAttribute('aria-pressed', 'true')
    expect(on).toHaveTextContent('Web search')
    await waitFor(() => expect(on).toHaveFocus())
  })
})
