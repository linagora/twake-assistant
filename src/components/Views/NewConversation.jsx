import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { makeConversationId } from '@/lib/conversation'

export function NewConversation() {
  const [conversationId] = useState(makeConversationId)

  return <Navigate replace to={`/assistant/${conversationId}`} />
}
