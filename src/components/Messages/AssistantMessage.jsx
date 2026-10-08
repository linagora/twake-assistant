import { useMessage } from '@assistant-ui/react'
import React from 'react'

import AssistantMessageActions from './AssistantMessageActions'

import { Answer } from '@/components/Messages/Answer'

const AssistantMessage = () => {
  const isError = useMessage(s => s.metadata?.custom?.isError === true)

  return (
    <Answer>
      <AssistantMessageActions canCopy={!isError} />
    </Answer>
  )
}

export default AssistantMessage
