import { useMessage } from '@assistant-ui/react'
import React from 'react'

import AssistantMessageActions from './AssistantMessageActions'

import { Answer } from '@/components/Messages/Answer'

const AssistantMessage = () => {
  const isError = useMessage(s => s.metadata?.custom?.isError === true)
  // Retrying fails again: the agent of the conversation is gone
  const isAssistantGone = useMessage(
    s => s.metadata?.custom?.isAssistantGone === true
  )

  return (
    <Answer>
      <AssistantMessageActions canCopy={!isError} canRetry={!isAssistantGone} />
    </Answer>
  )
}

export default AssistantMessage
