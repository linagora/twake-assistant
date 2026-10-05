export const ASSISTANT_ROUTE_PATH = 'assistant/:conversationId'

// Same format as the conversation ids made by cozy-search
export function makeConversationId() {
  return `${Date.now()}-${Math.floor(Math.random() * 90000) + 10000}`
}
