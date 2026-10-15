import { useQuery } from 'cozy-client'

import {
  buildAssistantByIdQuery,
  buildChatConversationQueryById
} from '../queries'

/**
 * Whether the assistant a conversation is bound to was deleted: the stack
 * answers no message of it then, rather than widen its knowledge base to the
 * whole instance
 */
export const useIsConversationAssistantGone = conversationId => {
  const conversationQuery = buildChatConversationQueryById(conversationId)
  const { data: conversation } = useQuery(
    conversationQuery.definition,
    conversationQuery.options
  )
  const boundId = conversation?.relationships?.assistant?.data?._id
  const assistantQuery = buildAssistantByIdQuery(boundId)
  const { data: assistant, fetchStatus } = useQuery(
    assistantQuery.definition,
    assistantQuery.options
  )

  // A deleted assistant loads as null: a failed fetch is not a deletion
  return !!boundId && fetchStatus === 'loaded' && assistant?._id !== boundId
}
