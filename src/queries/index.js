import { Q, fetchPolicies } from 'cozy-client'

import { DOCTYPE_FILES } from '@/doctypes'

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
