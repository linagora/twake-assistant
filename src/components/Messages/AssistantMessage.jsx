import { useMessage } from '@assistant-ui/react'
import React from 'react'

import AssistantMessageActions from './AssistantMessageActions'

import { Answer, getText } from '@/components/Messages/Answer'

const AssistantMessage = () => {
  const isError = useMessage(s => s.metadata?.custom?.isError === true)
  const hasText = useMessage(message => getText(message) !== '')

  return (
    <Answer>
      <AssistantMessageActions canCopy={!isError && hasText} />
    </Answer>
  )
}

export default AssistantMessage
