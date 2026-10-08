import { Q, fetchPolicies } from 'cozy-client'

import { DOCTYPE_AI_CHAT_CONVERSATIONS, DOCTYPE_FILES } from '@/doctypes'

const DEFAULT_CACHE_TIMEOUT_QUERIES = 9 * 60 * 1000
const defaultFetchPolicy = fetchPolicies.olderThan(
  DEFAULT_CACHE_TIMEOUT_QUERIES
)

export function buildFilesByIdsQuery(ids) {
  return {
    definition: () => Q(DOCTYPE_FILES).getByIds(ids),
    options: {
      as: `${DOCTYPE_FILES}/ids/${ids.join('/')}`,
      fetchPolicy: defaultFetchPolicy,
      enabled: ids.length > 0
    }
  }
}

// ponytail: the 50 last conversations, no paging in the history of the scribe
const CONVERSATIONS_LIMIT = 50

export function buildConversationsQuery() {
  return {
    definition: () =>
      Q(DOCTYPE_AI_CHAT_CONVERSATIONS)
        .where({ 'cozyMetadata.updatedAt': { $gt: null } })
        .indexFields(['cozyMetadata.updatedAt'])
        .sortBy([{ 'cozyMetadata.updatedAt': 'desc' }])
        .limitBy(CONVERSATIONS_LIMIT),
    options: {
      as: `${DOCTYPE_AI_CHAT_CONVERSATIONS}/updatedAt/desc`,
      fetchPolicy: defaultFetchPolicy
    }
  }
}
