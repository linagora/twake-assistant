import cx from 'classnames'
import React, { useState, useRef, useEffect } from 'react'

import { Icon, Dropdown } from '@linagora/twake-icons'
import Chips from 'cozy-ui/transpiled/react/Chips'

import AssistantAvatar from './AssistantAvatar'
import AssistantMenu, { useSelectedAssistant } from './AssistantMenu'
import styles from './styles.styl'
import { CHIP_CLASSES } from '../TwakeKnowledges/SourceButton'
import sourceStyles from '../TwakeKnowledges/styles.styl'

/**
 * With `selectable` the chip opens the assistant menu (the mobile header);
 * otherwise it only names the assistant, picked from the sidebar. `disabled`
 * is for a conversation that started: its assistant cannot change.
 */
const AssistantSelection = ({
  className,
  disabled,
  selectable = true,
  borderless = false,
  onSelect
}) => {
  const buttonRef = useRef(null)
  const [open, setOpen] = useState(false)
  const { selectedAssistant } = useSelectedAssistant()
  const isClickable = selectable && !disabled

  useEffect(() => {
    if (disabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false)
    }
  }, [disabled])

  return (
    <>
      <div className={className} ref={buttonRef}>
        <Chips
          icon={
            <AssistantAvatar
              className={styles['assistant-icon--composer']}
              assistant={selectedAssistant}
            />
          }
          label={
            <span className="u-flex u-flex-items-center">
              {selectedAssistant.name}
              {isClickable && (
                <Icon
                  icon={Dropdown}
                  size={16}
                  className="u-ml-half u-flex-shrink-0"
                />
              )}
            </span>
          }
          className={cx(sourceStyles['source-chip'], {
            [styles['chip']]: borderless
          })}
          classes={CHIP_CLASSES}
          {...(isClickable
            ? {
                clickable: true,
                onClick: () => setOpen(true),
                'aria-haspopup': 'menu',
                'aria-expanded': open
              }
            : { 'aria-disabled': !!disabled })}
        />
      </div>
      <AssistantMenu
        anchorRef={buttonRef}
        open={open}
        onClose={() => setOpen(false)}
        onSelect={onSelect}
      />
    </>
  )
}

export default AssistantSelection
