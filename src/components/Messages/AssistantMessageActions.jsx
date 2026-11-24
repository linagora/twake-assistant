import { ActionBarPrimitive, useAuiState } from '@assistant-ui/react'
import React from 'react'

import { Check, Copy, Icon, Restore } from '@linagora/twake-icons'
import Button from 'cozy-ui/transpiled/react/Buttons'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import { useI18n } from 'twake-i18n'

import { DismissibleTooltip } from '@/components/DismissibleTooltip'

const ICON_SIZE = 16

const AssistantMessageActions = ({
  canCopy,
  canRetry = true,
  isInterrupted = false
}) => {
  const { t } = useI18n()

  const isCopied = useAuiState(({ message }) => message.isCopied)
  // The stack keeps a single thread per conversation: regenerating an
  // older answer would drop the following messages on screen only.
  const isLast = useAuiState(({ message }) => message.isLast)
  const copyLabel = t(
    isCopied ? 'assistant.actions.copied' : 'assistant.actions.copy'
  )
  const retryLabel = t('assistant.actions.retry')

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      className="u-flex u-flex-items-center u-mt-half"
    >
      {canCopy && (
        <DismissibleTooltip title={copyLabel}>
          <ActionBarPrimitive.Copy asChild>
            <IconButton size="small" aria-label={copyLabel}>
              <Icon icon={isCopied ? Check : Copy} size={ICON_SIZE} />
            </IconButton>
          </ActionBarPrimitive.Copy>
        </DismissibleTooltip>
      )}
      {/* A question left without an answer: asked again in words */}
      {isLast && canRetry && isInterrupted && (
        <ActionBarPrimitive.Reload asChild>
          <Button
            size="small"
            variant="secondary"
            label={t('chat.ask_again')}
          />
        </ActionBarPrimitive.Reload>
      )}
      {isLast && canRetry && !isInterrupted && (
        <DismissibleTooltip title={retryLabel}>
          <ActionBarPrimitive.Reload asChild>
            <IconButton size="small" aria-label={retryLabel}>
              <Icon icon={Restore} size={ICON_SIZE} />
            </IconButton>
          </ActionBarPrimitive.Reload>
        </DismissibleTooltip>
      )}
    </ActionBarPrimitive.Root>
  )
}

export default AssistantMessageActions
