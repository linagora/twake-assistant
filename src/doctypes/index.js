export const DOCTYPE_ACCOUNTS = 'io.cozy.accounts'
export const DOCTYPE_AI_CHAT_ASSISTANTS = 'io.cozy.ai.chat.assistants'
export const DOCTYPE_AI_CHAT_CONVERSATIONS = 'io.cozy.ai.chat.conversations'

// cozy-search includes the provider of an assistant and the assistant of a
// conversation in its queries: both relationships must be declared here.
export default {
  assistants: {
    doctype: DOCTYPE_AI_CHAT_ASSISTANTS,
    relationships: {
      provider: {
        type: 'has-one',
        doctype: DOCTYPE_ACCOUNTS
      }
    }
  },
  conversations: {
    doctype: DOCTYPE_AI_CHAT_CONVERSATIONS,
    relationships: {
      assistant: {
        type: 'has-one',
        doctype: DOCTYPE_AI_CHAT_ASSISTANTS
      }
    }
  }
}
