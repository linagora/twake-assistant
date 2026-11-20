import { useMessage } from '@assistant-ui/react'
import React from 'react'
import { useParams } from 'react-router-dom'

import { useIsConversationAssistantGone } from '../KnowledgeBase/useIsConversationAssistantGone'
import AssistantMessageActions from './AssistantMessageActions'

import { Answer, getText } from '@/components/Messages/Answer'

const AssistantMessage = () => {
  const { conversationId } = useParams()
  const isError = useMessage(s => s.metadata?.custom?.isError === true)
  const hasText = useMessage(message => getText(message) !== '')
  // Retrying fails again: the agent of the conversation is gone
  const isAssistantGone = useMessage(
    s => s.metadata?.custom?.isAssistantGone === true
  )
  // A conversation whose agent was deleted is read-only
  const isConversationAssistantGone =
    useIsConversationAssistantGone(conversationId)

  return (
    <Answer>
      <AssistantMessageActions
        canCopy={!isError && hasText}
        canRetry={!isAssistantGone && !isConversationAssistantGone}
      />
    </Answer>
  )
}

export default AssistantMessage
