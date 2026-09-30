// Same format as the conversation ids made by cozy-search
export const makeConversationId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 90000) + 10000}`
