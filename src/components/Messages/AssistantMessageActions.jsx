import { ActionBarPrimitive, useAuiState } from '@assistant-ui/react'
import React from 'react'

import { Check, Copy, Icon, Restore } from '@linagora/twake-icons'
import Button from 'cozy-ui/transpiled/react/Buttons'
import { useI18n } from 'twake-i18n'

const ICON_SIZE = 16

const ActionButton = ({ icon, label }) => (
  <Button
    variant="text"
    color="inherit"
    size="small"
    className="u-fz-tiny u-miw-auto"
    startIcon={<Icon icon={icon} size={ICON_SIZE} />}
    label={label}
  />
)

const AssistantMessageActions = ({ canCopy }) => {
  const { t } = useI18n()

  const isCopied = useAuiState(({ message }) => message.isCopied)
  // The stack keeps a single thread per conversation: regenerating an
  // older answer would drop the following messages on screen only.
  const isLast = useAuiState(({ message }) => message.isLast)

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      className="u-flex u-flex-items-center u-mt-half"
    >
      {canCopy && (
        <ActionBarPrimitive.Copy asChild>
          <ActionButton
            icon={isCopied ? Check : Copy}
            label={t(
              isCopied ? 'assistant.actions.copied' : 'assistant.actions.copy'
            )}
          />
        </ActionBarPrimitive.Copy>
      )}
      {isLast && (
        <ActionBarPrimitive.Reload asChild>
          <ActionButton icon={Restore} label={t('assistant.actions.retry')} />
        </ActionBarPrimitive.Reload>
      )}
    </ActionBarPrimitive.Root>
  )
}

export default AssistantMessageActions
