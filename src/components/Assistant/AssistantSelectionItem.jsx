import cx from 'classnames'
import React, { useMemo } from 'react'

import { Icon, Check, Pen, Trash } from '@linagora/twake-icons'
import ActionsMenuItem from 'cozy-ui/transpiled/react/ActionsMenu/ActionsMenuItem'
import Badge from 'cozy-ui/transpiled/react/Badge'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useBreakpoints } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { useI18n } from 'twake-i18n'

import AssistantAvatar from '../Assistant/AssistantAvatar'
import styles from './styles.styl'

const AssistantSelectionItem = ({
  assistant,
  onClose,
  onSelect,
  selectedAssistant,
  setAssistantIdInAction,
  setIsOpenDeleteAssistant,
  setIsOpenEditAssistant,
  disableActions = false,
  // Read by MUI Menu to focus this item on opening, not forwarded so that
  // the item keeps no grey selected background: aria-checked tells it
  selected,
  ...menuItemProps
}) => {
  const { isMobile } = useBreakpoints()
  const { t } = useI18n()

  const handleSelect = assistant => {
    onSelect(assistant)
    onClose()
  }

  const assistantId = assistant._id || assistant.id

  const handleDelete = e => {
    setAssistantIdInAction(assistantId)
    setIsOpenDeleteAssistant(true)
    onClose()
    e.stopPropagation()
  }

  const handleEdit = e => {
    setAssistantIdInAction(assistantId)
    setIsOpenEditAssistant(true)
    onClose()
    e.stopPropagation()
  }

  const isSelected = useMemo(
    () => selectedAssistant?._id === assistantId,
    [selectedAssistant?._id, assistantId]
  )

  // Edit and Delete stay out of the Tab order, as Tab closes a menu: the
  // arrows move between the item and its buttons, MUI handles the others
  const handleKeyDown = e => {
    const item = e.currentTarget
    const targets = [item, ...item.querySelectorAll('button')]
    const index = targets.indexOf(document.activeElement)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const next = targets[index + (e.key === 'ArrowRight' ? 1 : -1)]
      if (next) next.focus()
      e.preventDefault()
      return
    }
    // MUI moves from the focused element, which must be the item
    if (index > 0 && ['ArrowDown', 'ArrowUp'].includes(e.key)) item.focus()
    menuItemProps.onKeyDown?.(e)
  }

  const hintId = `assistant-actions-hint-${assistantId}`

  return (
    <ActionsMenuItem
      {...menuItemProps}
      role="menuitemradio"
      aria-checked={isSelected}
      aria-label={assistant.name}
      {...(!disableActions && {
        'aria-describedby': hintId,
        'aria-keyshortcuts': 'ArrowRight'
      })}
      onKeyDown={handleKeyDown}
      onClick={() => handleSelect(assistant)}
      className={styles['menu-item']}
    >
      <div className="u-flex u-flex-items-center">
        {isMobile && isSelected ? (
          <Badge
            badgeContent={
              <Icon
                icon={Check}
                size={10}
                className={styles['selected-item--mobile']}
              />
            }
            variant="standard"
            size="small"
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            overlap="circular"
          >
            <AssistantAvatar assistant={assistant} />
          </Badge>
        ) : (
          <AssistantAvatar assistant={assistant} />
        )}
        <Typography variant="body1">{assistant.name}</Typography>
      </div>
      <div className="u-flex u-flex-items-center u-flex-justify-between">
        {isSelected && !isMobile && (
          <Icon icon={Check} className="u-success" aria-hidden="true" />
        )}
        {!disableActions && (
          <div className={styles['menu-item-actions']}>
            <span id={hintId} className="u-visuallyhidden">
              {t('assistant_edit.actions_hint')}
            </span>
            <IconButton
              aria-label={t('assistant_edit.label', { name: assistant.name })}
              tabIndex={-1}
              size="small"
              className={cx({
                [styles['menu-item-icon-button']]:
                  !isMobile || (!isSelected && isMobile),
                'u-db': isSelected && isMobile
              })}
              onClick={handleEdit}
            >
              <Icon icon={Pen} color="var(--primaryColor)" />
            </IconButton>
            <IconButton
              aria-label={t('assistant_delete.label', { name: assistant.name })}
              tabIndex={-1}
              size="small"
              className={cx({
                [styles['menu-item-icon-button']]:
                  !isMobile || (!isSelected && isMobile),
                'u-db': isSelected && isMobile
              })}
              onClick={handleDelete}
            >
              <Icon icon={Trash} className="u-error" />
            </IconButton>
          </div>
        )}
      </div>
    </ActionsMenuItem>
  )
}

export default AssistantSelectionItem
