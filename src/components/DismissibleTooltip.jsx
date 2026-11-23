import React, { useEffect, useState } from 'react'

import Tooltip from 'cozy-ui/transpiled/react/Tooltip'

/**
 * A cozy-ui Tooltip that Escape dismisses (WCAG 1.4.13): it stays closed
 * until the next hover or focus
 */
export const DismissibleTooltip = ({ onOpen, onClose, ...props }) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = event => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <Tooltip
      {...props}
      open={open}
      onOpen={event => {
        setOpen(true)
        onOpen?.(event)
      }}
      onClose={event => {
        setOpen(false)
        onClose?.(event)
      }}
    />
  )
}
