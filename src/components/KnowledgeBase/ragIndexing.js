import { withRootFolderIfMissing } from './knowledgeBase'
import {
  ASSISTANTS_DOCTYPE,
  buildAllAssistantsQuery,
  FILES_DOCTYPE
} from '../queries'

export const RAG_INDEX_WORKER = 'rag-index'
export const RAG_INDEX_FILES_DEBOUNCE = '30s'
const TRIGGERS_DOCTYPE = 'io.cozy.triggers'

/**
 * The two rag-index triggers of an instance: one on the files (debounced,
 * they change often), one on the assistants (a knowledge base change must
 * be seen at once). Both carry the same message.
 */
export const makeRagIndexTriggerAttributes = doctype => ({
  type: '@event',
  arguments: doctype,
  ...(doctype === FILES_DOCTYPE ? { debounce: RAG_INDEX_FILES_DEBOUNCE } : {}),
  worker: RAG_INDEX_WORKER,
  message: { doctype: FILES_DOCTYPE }
})

/**
 * Lists the rag-index triggers of the instance by kind.
 * @returns {Promise<{ files: object|null, assistants: object|null }>}
 */
export const findRagIndexTriggers = async client => {
  const { data: triggers } = await client
    .collection(TRIGGERS_DOCTYPE)
    .find({ worker: RAG_INDEX_WORKER })
  const found = { files: null, assistants: null }
  for (const trigger of triggers || []) {
    if (trigger.type !== '@event') continue
    if (trigger.arguments === FILES_DOCTYPE && !found.files) {
      found.files = trigger
    } else if (trigger.arguments === ASSISTANTS_DOCTYPE && !found.assistants) {
      found.assistants = trigger
    }
  }
  return found
}

export const fetchAssistants = client => {
  const { definition, options } = buildAllAssistantsQuery()
  return client.queryAll(definition(), options)
}

/**
 * Gives the root folder to every assistant without a knowledge base
 * folder (the rule is permanent: an assistant always has one). A conflict
 * on one assistant means another session did it: skipped.
 * @param {import('cozy-client').CozyClient} client
 * @param {Array<object>} [assistants] - The assistants, when already fetched.
 * @returns {Promise<string[]>} The ids of the migrated assistants.
 */
export const migrateAssistantsWithoutFolder = async (client, assistants) => {
  const migrated = []
  for (const assistant of assistants || (await fetchAssistants(client))) {
    const knowledgeBase = withRootFolderIfMissing(assistant.knowledgeBase)
    if (knowledgeBase === assistant.knowledgeBase) continue
    try {
      await client.save({ ...assistant, knowledgeBase })
      migrated.push(assistant._id)
    } catch (error) {
      if (error?.status !== 409) throw error
    }
  }
  return migrated
}

/**
 * Creates the rag-index triggers the instance lacks, and launches the
 * files one when it is created.
 * @param {import('cozy-client').CozyClient} client
 * @returns {Promise<string[]>} The `arguments` of the triggers created.
 */
export const createRagIndexTriggers = async client => {
  const created = []
  const { files, assistants } = await findRagIndexTriggers(client)
  const triggers = client.collection(TRIGGERS_DOCTYPE)
  if (!assistants) {
    await triggers.create(makeRagIndexTriggerAttributes(ASSISTANTS_DOCTYPE))
    created.push(ASSISTANTS_DOCTYPE)
  }
  if (!files) {
    const { data: trigger } = await triggers.create(
      makeRagIndexTriggerAttributes(FILES_DOCTYPE)
    )
    // The first run: the worker creates the workspaces and indexes. A
    // trigger that could not be launched is removed, so the next setup
    // creates and launches it again instead of finding it and moving on.
    try {
      await triggers.launch(trigger)
    } catch (error) {
      await triggers.destroy(trigger).catch(() => {})
      throw error
    }
    created.push(FILES_DOCTYPE)
  }
  return created
}
