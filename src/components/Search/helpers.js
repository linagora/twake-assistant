const startOfDay = date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

export const formatDayLabel = (timestamp, lang) =>
  new Date(timestamp).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

/**
 * Buckets the conversations by the calendar day of their updatedAt, the most
 * recent day first.
 * @returns {Array<{ key: string, dayTimestamp: number, items: Array }>}
 */
export const groupConversationsByDate = conversations => {
  if (!conversations || conversations.length === 0) return []

  const now = new Date()
  const todayTs = startOfDay(now)
  const yesterdayTs = todayTs - 86400000

  const buckets = new Map()
  conversations.forEach(conv => {
    const raw = conv.cozyMetadata?.updatedAt || Date.now()
    const dayTs = startOfDay(new Date(raw))
    if (!buckets.has(dayTs)) buckets.set(dayTs, [])
    buckets.get(dayTs).push(conv)
  })

  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([dayTimestamp, items]) => {
      let key
      if (dayTimestamp === todayTs) key = 'today'
      else if (dayTimestamp === yesterdayTs) key = 'yesterday'
      else key = 'date'
      return { key, dayTimestamp, items }
    })
}
