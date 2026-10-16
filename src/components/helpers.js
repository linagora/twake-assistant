import { removeSourceMarks } from '@/lib/chat'
import { getScribeRequest } from '@/lib/scribe'

export const makeConversationId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 90000) + 10000}`

/**
 * Removes the marks of the sources, and substitutes a translated fallback
 * for an empty assistant answer.
 * @param {{ role: string, content: string }} message
 * @param {(key: string) => string} t
 * @returns {string}
 */
export const formatAnswer = (message, t) => {
  const text = removeSourceMarks(message.content ?? '')
  return message.role === 'assistant' && !text.trim() ? t('chat.empty') : text
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

// No rule names a conversation yet: the first question of the user does, as
// the user asked it (the stack keeps the query sent to the LLM)
export const getNameOfConversation = (conversation, t) => {
  if (conversation.name) return conversation.name
  const question = conversation.messages?.find(
    message => message.role === 'user'
  )
  return question && getScribeRequest(question.content, t)
}

// No rule describes a conversation yet: the last answer does
export const getDescriptionOfConversation = (conversation, t) => {
  const answer = conversation?.messages?.findLast(
    message => message.role === 'assistant'
  )
  if (!answer) return undefined
  return formatAnswer(answer, t)
}

// A pinned conversation is a favorite of cozy-stack, kept in `cozyMetadata`
export const isPinned = conversation =>
  conversation.cozyMetadata?.favorite === true
