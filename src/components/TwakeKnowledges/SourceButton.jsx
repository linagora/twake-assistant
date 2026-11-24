import cx from 'classnames'
import React, { forwardRef, useEffect, useRef, useState } from 'react'

import { Icon } from '@linagora/twake-icons'
import Chip from 'cozy-ui/transpiled/react/Chips'
import IconButton from 'cozy-ui/transpiled/react/IconButton'

import { DismissibleTooltip } from '../DismissibleTooltip'
import styles from './styles.styl'

/**
 * The classes giving a cozy-ui Chip the spacing of the composer chips of the
 * design (with `styles['source-chip']` on the chip itself).
 */
export const CHIP_CLASSES = {
  icon: styles['source-chip-icon'],
  label: styles['source-chip-label']
}

/**
 * A monochrome `icon` is tinted primary when active; a multicolor one, with
 * `preserveColor`, is dimmed when inactive. Without `onClick` it is a static
 * indicator, not a button. With `onClick` it is a toggle named by a tooltip,
 * that also shows its label once active, so the state does not rest on the
 * colour of the icon alone.
 */
const SourceButton = forwardRef(
  (
    {
      icon,
      label,
      isActive = true,
      preserveColor = false,
      onClick,
      className,
      ...props
    },
    ref
  ) => {
    // The active and inactive toggles are different elements: the one that
    // replaces the focused one takes the focus back. A render later: the
    // button of cozy-ui throws when focused before its first effect, which
    // mounts its focus ripple, has rendered.
    const nodeRef = useRef(null)
    const hadFocus = useRef(false)
    const [isFocusPending, setIsFocusPending] = useState(false)
    useEffect(() => {
      if (!hadFocus.current) return
      hadFocus.current = false
      setIsFocusPending(true)
    }, [isActive])
    useEffect(() => {
      if (!isFocusPending) return
      setIsFocusPending(false)
      nodeRef.current?.focus()
    }, [isFocusPending])
    const setRef = node => {
      nodeRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }

    const content = preserveColor ? (
      <Icon
        icon={icon}
        size={20}
        preserveColor
        className={cx({
          [styles['source-button-image--inactive']]: !isActive
        })}
      />
    ) : (
      <Icon
        icon={icon}
        size={20}
        color={isActive ? 'var(--primaryColor)' : 'var(--secondaryTextColor)'}
      />
    )

    if (!onClick) {
      return (
        <span
          ref={ref}
          role="img"
          aria-label={label}
          title={label}
          className={cx(
            'u-flex u-flex-items-center u-flex-justify-center',
            styles['source-button'],
            className
          )}
          {...props}
        >
          {content}
        </span>
      )
    }

    const handleClick = event => {
      onClick(event)
      hadFocus.current = document.activeElement === event.currentTarget
    }

    return (
      <DismissibleTooltip title={label}>
        {isActive ? (
          <Chip
            ref={setRef}
            variant="ghost"
            focusRipple
            icon={<Icon icon={icon} size={16} />}
            label={label}
            aria-label={label}
            onClick={handleClick}
            className={cx(styles['source-chip'], className)}
            classes={CHIP_CLASSES}
            {...props}
          />
        ) : (
          <IconButton
            ref={setRef}
            size="small"
            aria-label={label}
            onClick={handleClick}
            className={cx(styles['source-button'], className)}
            {...props}
          >
            {content}
          </IconButton>
        )}
      </DismissibleTooltip>
    )
  }
)
SourceButton.displayName = 'SourceButton'

export default SourceButton
