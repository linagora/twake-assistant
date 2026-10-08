import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { makeConversationId } from '@/components/helpers'

export function NewConversation() {
  const [conversationId] = useState(makeConversationId)

  return <Navigate replace to={`/assistant/${conversationId}`} />
}
