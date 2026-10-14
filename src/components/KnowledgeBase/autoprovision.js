import flag from 'cozy-flags'

import { AUTOPROVISION_FLAG, ensureProvisionedAssistants } from './provisioning'
import {
  createRagIndexTriggers,
  fetchAssistants,
  migrateKnowledgeBases
} from './ragIndexing'

const warn = (...args) => {
  // eslint-disable-next-line no-console
  console.warn('assistant autoprovision:', ...args)
}

let pending = null

export const resetAutoprovisionForTests = () => {
  pending = null
}

/** The entries of the autoprovision flag, or null when it lists nothing. */
export const autoprovisionEntries = () => {
  const entries = flag(AUTOPROVISION_FLAG)
  return Array.isArray(entries) && entries.length > 0 ? entries : null
}

const run = async client => {
  const setup = { triggers: [], migrated: [], errors: [] }
  let assistants = null
  try {
    assistants = await fetchAssistants(client)
    setup.migrated = await migrateKnowledgeBases(client, assistants)
  } catch (error) {
    warn('cannot migrate the knowledge bases', error)
    setup.errors.push(error)
  }
  const entries = autoprovisionEntries()
  if (!entries) return null
  const result = await ensureProvisionedAssistants(client, entries, {
    assistants
  })
  if (result.skipped.length > 0) {
    warn('skipped entries', result.skipped)
  }
  // Last: the launch of the files trigger indexes the folders just
  // provisioned
  try {
    setup.triggers = await createRagIndexTriggers(client)
  } catch (error) {
    warn('cannot set up the rag-index triggers', error)
    setup.errors.push(error)
  }
  return { setup, ...result }
}

/**
 * Migrates the knowledge bases of the assistants, on every instance, then
 * provisions the assistants listed in the autoprovision flag and sets up
 * the rag-index triggers. Runs once per session: every call shares the
 * first one's promise. Never rejects.
 * @param {import('cozy-client').CozyClient} client
 * @returns {Promise<null|{setup: object, created: string[], ensured: string[], skipped: {id: string, reason: string}[]}>} Null when the flag lists nothing.
 */
export const autoprovisionAssistants = client => {
  if (!pending) {
    pending = run(client).catch(error => {
      warn('failed', error)
      return null
    })
  }
  return pending
}
