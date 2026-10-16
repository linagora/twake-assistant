import React, { useState, useRef } from 'react'

import { Icon, Dots } from '@linagora/twake-icons'
import { Mutations, useClient } from 'cozy-client'
import flag from 'cozy-flags'
import ActionsMenu from 'cozy-ui/transpiled/react/ActionsMenu'
import { makeActions } from 'cozy-ui/transpiled/react/ActionsMenu/Actions'
import Button from 'cozy-ui/transpiled/react/Buttons'
import { ConfirmDialog } from 'cozy-ui/transpiled/react/CozyDialogs'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import TextField from 'cozy-ui/transpiled/react/TextField'
import { useAlert } from 'cozy-ui/transpiled/react/providers/Alert'
import { useI18n } from 'twake-i18n'

import { remove } from '../../actions/delete'
import { rename } from '../../actions/rename'
import { share } from '../../actions/share'
import { getNameOfConversation, isPinned } from '../helpers'
import { CHAT_CONVERSATIONS_DOCTYPE } from '../queries'

const ConversationActions = ({
  actions = [
    rename,
    flag('cozy.assistant.conversation-sharing.enabled') && share,
    remove
  ],
  buttonClassName,
  conversation,
  onDelete
}) => {
  const { t } = useI18n()
  const client = useClient()
  const { showAlert } = useAlert()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const anchorRef = useRef(null)

  const toggleMenu = e => {
    e?.stopPropagation()
    setIsMenuOpen(prev => !prev)
  }

  const handleOpenRename = () => {
    setNewName(getNameOfConversation(conversation, t) || '')
    setShowRenameDialog(true)
  }

  const handleRename = async () => {
    try {
      await client.save({
        ...conversation,
        _type: CHAT_CONVERSATIONS_DOCTYPE,
        name: newName.trim()
      })
      setShowRenameDialog(false)
    } catch {
      showAlert({
        message: t('assistant.default_error'),
        severity: 'error'
      })
    }
  }

  const handleDelete = async () => {
    try {
      await client.destroy({
        ...conversation,
        _type: CHAT_CONVERSATIONS_DOCTYPE
      })
      setShowDeleteDialog(false)
      onDelete?.(conversation)
    } catch {
      showAlert({
        message: t('assistant.default_error'),
        severity: 'error'
      })
    }
  }

  const handleTogglePin = async () => {
    // `assistant` is the assistant for display, not an attribute: its link
    // is in `relationships`
    const { assistant, ...attributes } = conversation
    try {
      // Not client.save, which would date the conversation of now and move
      // it in the history: its date is the one of its last message
      await client.mutate(
        Mutations.updateDocument({
          ...attributes,
          _type: CHAT_CONVERSATIONS_DOCTYPE,
          cozyMetadata: {
            ...conversation.cozyMetadata,
            favorite: !isPinned(conversation)
          }
        })
      )
    } catch {
      showAlert({
        message: t('assistant.default_error'),
        severity: 'error'
      })
    }
  }

  const menuActions = makeActions(actions.filter(Boolean), {
    t,
    isPinned: isPinned(conversation),
    onRename: handleOpenRename,
    onTogglePin: handleTogglePin,
    onDelete: () => setShowDeleteDialog(true)
  })

  return (
    <>
      <IconButton
        className={buttonClassName}
        size="small"
        ref={anchorRef}
        aria-label={t('assistant.sidebar.conversation.actions.more')}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={toggleMenu}
      >
        <Icon icon={Dots} />
      </IconButton>
      {isMenuOpen && (
        <ActionsMenu
          ref={anchorRef}
          open
          actions={menuActions}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left'
          }}
          autoClose
          onClose={toggleMenu}
        />
      )}
      {showRenameDialog && (
        <ConfirmDialog
          open
          title={t('assistant.sidebar.conversation.actions.rename')}
          content={
            <TextField
              autoFocus
              fullWidth
              variant="outlined"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newName.trim()) {
                  handleRename()
                }
              }}
            />
          }
          actions={
            <>
              <Button
                variant="secondary"
                label={t('assistant_create.buttons.cancel')}
                onClick={() => setShowRenameDialog(false)}
              />
              <Button
                label={t('assistant_edit.buttons.edit')}
                onClick={handleRename}
                disabled={!newName.trim()}
              />
            </>
          }
          onClose={() => setShowRenameDialog(false)}
        />
      )}
      {showDeleteDialog && (
        <ConfirmDialog
          open
          title={t('conversation_delete.title')}
          content={t('conversation_delete.content')}
          actions={
            <>
              <Button
                variant="secondary"
                label={t('conversation_delete.buttons.cancel')}
                onClick={() => setShowDeleteDialog(false)}
              />
              <Button
                color="error"
                label={t('conversation_delete.buttons.confirm')}
                onClick={handleDelete}
              />
            </>
          }
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  )
}

export default ConversationActions
