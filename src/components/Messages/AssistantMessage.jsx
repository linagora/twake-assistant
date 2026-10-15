import { useMessage } from '@assistant-ui/react'
import React from 'react'

import AssistantMessageActions from './AssistantMessageActions'

import { Answer, getText } from '@/components/Messages/Answer'

const AssistantMessage = () => {
  const isError = useMessage(s => s.metadata?.custom?.isError === true)
  const hasText = useMessage(message => getText(message) !== '')
  // Retrying fails again: the agent of the conversation is gone
  const isAssistantGone = useMessage(
    s => s.metadata?.custom?.isAssistantGone === true
  )

  return (
    <Answer>
      <AssistantMessageActions
        canCopy={!isError && hasText}
        canRetry={!isAssistantGone}
      />
    </Answer>
  )
}

export default AssistantMessage
