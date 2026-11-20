import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { DismissibleTooltip } from '@/components/DismissibleTooltip'

describe('DismissibleTooltip', () => {
  it('hides the tooltip on Escape and keeps the focus on the trigger', async () => {
    render(
      <DismissibleTooltip title="Copy">
        <button>trigger</button>
      </DismissibleTooltip>
    )
    const trigger = screen.getByText('trigger')
    trigger.focus()

    fireEvent.mouseOver(trigger)
    expect(await screen.findByRole('tooltip')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('tooltip')).toBe(null))
    expect(trigger).toHaveFocus()
  })
})
