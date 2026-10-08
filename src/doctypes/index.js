export const DOCTYPE_ACCOUNTS = 'io.cozy.accounts'
export const DOCTYPE_AI_CHAT_ASSISTANTS = 'io.cozy.ai.chat.assistants'
export const DOCTYPE_AI_CHAT_CONVERSATIONS = 'io.cozy.ai.chat.conversations'
export const DOCTYPE_AI_CHAT_EVENTS = 'io.cozy.ai.chat.events'
export const DOCTYPE_FILES = 'io.cozy.files'

// The queries of the assistant include the provider of an assistant and the
// assistant of a conversation: both relationships must be declared here.
export const schema = {
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
