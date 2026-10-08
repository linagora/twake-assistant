export const makeConversationId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 90000) + 10000}`

/**
 * Removes the source tags the UI does not handle yet, like [REF]...[/REF]
 * or [doc_X].
 * @param {string} content
 * @returns {string}
 */
export const sanitizeChatContent = content => {
  if (!content) {
    return ''
  }
  return (
    content
      // remove « [REF]doc_1[/REF] »
      .replace(/\s?\[REF\][\s\S]*?\[\/REF\]/g, '')
      // remove « REFdoc_1/REF »
      .replace(/\s?REF[\s\S]*?\/REF/g, '')
      // remove « [doc_1] »
      .replace(/\s?\[doc_\d+\]/g, '')
      // remove « [Source 1] », « [Source 4, 6] » or « [Source 4, Source 6] »
      .replace(/\s?\[Source\s+\d+(?:\s*,\s*(?:Source\s+)?\d+)*\]/g, '')
      // remove « [Sources: 1, 3, 6] » citations, with optional empty link parens
      .replace(/\s?\[Sources?:\s*\d+(?:\s*,\s*\d+)*\s*\](?:\([^)]*\))?/g, '')
  )
}

/**
 * Sanitizes the citation markup, and substitutes a translated fallback for
 * an empty assistant answer.
 * @param {{ role: string, content: string }} message
 * @param {(key: string) => string} t
 * @returns {string}
 */
export const formatAnswer = (message, t) => {
  const sanitized = sanitizeChatContent(message.content)
  return message.role === 'assistant' && !sanitized.trim()
    ? t('assistant.default_empty_response')
    : sanitized
}

export const formatConversationDate = (dateString, t, lang) => {
  if (!dateString) return ''
  const date = new Date(dateString)

  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isToday || isYesterday) {
    const timeStr = date.toLocaleTimeString(lang, {
      hour: 'numeric',
      minute: '2-digit'
    })
    return `${
      isToday ? t('assistant.time.today') : t('assistant.time.yesterday')
    }, ${timeStr}`
  }

  return date.toLocaleDateString(lang, {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })
}

// No rule names a conversation yet: the last question of the user does
export const getNameOfConversation = conversation => {
  return (
    conversation.name ||
    conversation.messages?.[conversation.messages?.length - 2]?.content
  )
}

// No rule describes a conversation yet: the last answer does
export const getDescriptionOfConversation = (conversation, t) => {
  const lastMessage = conversation?.messages?.[conversation.messages.length - 1]
  if (!lastMessage) return undefined
  return formatAnswer(lastMessage, t)
}
