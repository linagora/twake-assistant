import { models } from 'cozy-client'
import flag from 'cozy-flags'

import { getSelectedProviderById } from '../CreateAssistantSteps/helpers'
import {
  ACCOUNTS_DOCTYPE,
  ASSISTANTS_DOCTYPE,
  buildAssistantByIdQuery,
  FILES_DOCTYPE
} from '../queries'
import {
  getKnowledgeBaseDirId,
  isRootDirId,
  saveKnowledgeBase
} from './knowledgeBase'

export const AUTOPROVISION_FLAG = 'cozy.assistant.autoprovision'

const APPS_DOCTYPE = 'io.cozy.apps'
const OPENRAG_PROVIDER_ID = 'openrag'
// Some magic folders nest: io.cozy.apps/administrative/papers is one id.
const MAGIC_FOLDER_ID = /^io\.cozy\.apps\/.+$/

/**
 * Derives the CouchDB _id of a provisioned assistant from its name: only
 * [a-z0-9-] survive, so the id is URL-safe and never starts with "_".
 */
export const assistantIdFromName = name =>
  String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * The assistant new conversations start on: the first entry of the
 * autoprovision flag marked `default: true`, by its derived id. Null when
 * none is configured; the sentinel assistant is used then.
 */
export const getDefaultProvisionedAssistantId = () => {
  const entries = flag(AUTOPROVISION_FLAG)
  if (!Array.isArray(entries)) return null
  for (const entry of entries) {
    if (entry?.default !== true) continue
    const id = assistantIdFromName(entry.name)
    if (id) return id
  }
  return null
}

export const isMagicFolderId = dirId =>
  MAGIC_FOLDER_ID.test(String(dirId || ''))

const isNotFound = error => error?.status === 404

const isLiveDirectory = file =>
  !!file &&
  file.type === 'directory' &&
  !file.trashed &&
  !(file.path || '').startsWith('/.cozy_trash')

const warn = (...args) => {
  // eslint-disable-next-line no-console
  console.warn('assistant provisioning:', ...args)
}

const statLiveDirectory = async (stat, label) => {
  try {
    const { data: file } = await stat()
    if (isLiveDirectory(file)) return file._id
    warn(`folder ${label} is not a live directory`)
    return null
  } catch (error) {
    if (isNotFound(error)) {
      warn(`folder ${label} does not exist`)
      return null
    }
    throw error
  }
}

const resolveFolderById = async (client, dirId) => {
  if (isRootDirId(dirId)) return dirId
  if (isMagicFolderId(dirId)) {
    const folder = await models.folder.getReferencedFolder(client, {
      _type: APPS_DOCTYPE,
      _id: dirId
    })
    // The references listed by the stack include the trashed folders.
    if (isLiveDirectory(folder)) return folder._id
    warn(`magic folder ${dirId} has no live directory`)
    return null
  }
  return statLiveDirectory(
    () => client.collection(FILES_DOCTYPE).statById(dirId),
    dirId
  )
}

const findProvisionedFolder = async (client, { dirId, dirName }) => {
  if (dirId) {
    const id = await resolveFolderById(client, dirId)
    if (id || !dirName) return id
  }
  const path = `/${dirName}`
  return statLiveDirectory(
    () => client.collection(FILES_DOCTYPE).statByPath(path),
    path
  )
}

const createProvisionedFolder = async (client, { dirId, dirName, name }) => {
  const magic = isMagicFolderId(dirId)
  const folderName = magic ? name || dirName : dirName
  if (!folderName) return null
  const files = client.collection(FILES_DOCTYPE)
  const path = `/${folderName}`
  // Returns whatever already sits at the path, a file included.
  const { data: folder } = await files.createDirectoryByPath(path)
  if (!isLiveDirectory(folder)) {
    warn(`folder ${path} is not a live directory`)
    return null
  }
  if (magic) {
    // The app of the magic folder finds it by this reference and uses it.
    await files.addReferencesTo({ _type: APPS_DOCTYPE, _id: dirId }, [folder])
  }
  return folder._id
}

/**
 * Resolves the knowledge base folder of a flag entry. dirId wins; when it
 * does not resolve, like a magic folder its app has not created yet, the
 * dirName folder is used. When neither exists, the folder is created only
 * if the entry sets autoCreateFolder. Returns the dir id, or null.
 */
export const resolveProvisionedFolder = async (client, entry) => {
  const id = await findProvisionedFolder(client, entry)
  if (id || entry.autoCreateFolder !== true) return id
  return createProvisionedFolder(client, entry)
}

/**
 * Creates an openrag provider account. One per assistant, like the UI
 * (cozy-client's createAssistant) does: deleting an assistant deletes its
 * account, so a shared one would break the others.
 */
export const createOpenragAccount = async client => {
  const provider = getSelectedProviderById(OPENRAG_PROVIDER_ID)
  const { data: account } = await client.save({
    _type: ACCOUNTS_DOCTYPE,
    account_type: OPENRAG_PROVIDER_ID,
    identifier: 'accountName',
    auth: { accountName: provider.name },
    data: { model: provider.models[0] }
  })
  return account
}

const getAssistant = async (client, id, known) => {
  if (known) return known.get(id) || null
  try {
    const { definition, options } = buildAssistantByIdQuery(id)
    const { data } = await client.query(definition(), { as: options.as })
    return data || null
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

const createProvisionedAssistant = async (client, id, entry, dirId) => {
  const account = await createOpenragAccount(client)
  try {
    await client.save({
      _type: ASSISTANTS_DOCTYPE,
      _id: id,
      name: entry.name,
      prompt: entry.prompt || '',
      icon: entry.icon || null,
      relationships: {
        provider: {
          data: {
            _type: ACCOUNTS_DOCTYPE,
            _id: account._id,
            metadata: { providerId: OPENRAG_PROVIDER_ID }
          }
        }
      }
    })
  } catch (error) {
    // Created concurrently by another session: it is ours to ensure now,
    // and the account we made for it is an orphan.
    await client.destroy(account).catch(() => {})
    if (error?.status === 409) return false
    throw error
  }
  await saveKnowledgeBase(client, id, [{ doctype: FILES_DOCTYPE, dirId }])
  return true
}

const validate = entry => {
  const id = assistantIdFromName(entry?.name)
  if (!id) return { id: '', reason: 'invalid name' }
  if (!entry.dirId && !entry.dirName) {
    return { id, reason: 'dirId or dirName is required' }
  }
  return { id }
}

/**
 * Provisions the assistants described by the cozy.assistant.autoprovision
 * flag. Idempotent: an existing assistant is left alone, or gets the flag's
 * folder back when it lost it or fell back to the root. Two entries whose
 * names derive to the same id would fight over one assistant: the second
 * one is skipped.
 * @param {import('cozy-client').CozyClient} client
 * @param {Array<{name: string, dirName?: string, dirId?: string, autoCreateFolder?: boolean, prompt?: string, icon?: string|null, default?: boolean}>} configs - The flag entries.
 * @param {object} [options]
 * @param {Array<object>} [options.assistants] - Every assistant of the instance, when already fetched: spares one query per entry.
 * @returns {Promise<{created: string[], ensured: string[], skipped: {id: string, reason: string}[]}>}
 */
export const ensureProvisionedAssistants = async (
  client,
  configs,
  { assistants } = {}
) => {
  const result = { created: [], ensured: [], skipped: [] }
  if (!Array.isArray(configs) || configs.length === 0) return result
  const known = assistants
    ? new Map(assistants.map(assistant => [assistant._id, assistant]))
    : null

  const seen = new Set()
  for (const entry of configs) {
    const { id, reason } = validate(entry)
    if (reason) {
      result.skipped.push({ id, reason })
      continue
    }
    if (seen.has(id)) {
      result.skipped.push({ id, reason: 'duplicate assistant id' })
      continue
    }
    seen.add(id)
    try {
      let assistant = await getAssistant(client, id, known)
      let created = false
      if (!assistant) {
        const dirId = await resolveProvisionedFolder(client, entry)
        if (!dirId) {
          result.skipped.push({ id, reason: 'folder could not be resolved' })
          continue
        }
        created = await createProvisionedAssistant(client, id, entry, dirId)
        assistant = created
          ? { _id: id, knowledgeBase: [{ doctype: FILES_DOCTYPE, dirId }] }
          : await getAssistant(client, id)
      }

      if (created) {
        // saveKnowledgeBase already saved the knowledge base.
        result.created.push(id)
        continue
      }
      const current = getKnowledgeBaseDirId(assistant)
      if (entry.dirId && current === entry.dirId) {
        // The stack's rag-index worker skips a trashed folder by itself.
        result.ensured.push(id)
        continue
      }
      // The flag wins for provisioned assistants: resolve it first so we
      // can tell a deliberate root fallback from one the flag disagrees
      // with. Only a folder about to be re-attached may be created.
      const heal = current === null || isRootDirId(current)
      const wanted = heal
        ? await resolveProvisionedFolder(client, entry)
        : await findProvisionedFolder(client, entry)
      if (!wanted) {
        result.skipped.push({ id, reason: 'folder could not be resolved' })
        continue
      }
      if (current === null || (isRootDirId(current) && !isRootDirId(wanted))) {
        // Self-heal: an earlier run saved the assistant but not its
        // knowledge base, the user detached the folder, or it fell back to
        // the root while the flag still names a folder. The flag entry
        // still describes it, so re-attach it.
        await saveKnowledgeBase(client, id, [
          { doctype: FILES_DOCTYPE, dirId: wanted }
        ])
        result.ensured.push(id)
        continue
      }
      const live = await resolveFolderById(client, current)
      if (!live) {
        result.skipped.push({
          id,
          reason: `folder ${current} is missing or trashed`
        })
        continue
      }
      result.ensured.push(id)
    } catch (error) {
      warn(`entry ${id} failed`, error)
      result.skipped.push({ id, reason: error?.message || String(error) })
    }
  }
  return result
}
