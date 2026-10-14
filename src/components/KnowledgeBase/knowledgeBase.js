import { HasMany } from 'cozy-client'

import {
  buildAssistantByIdQuery,
  EMAIL_DOCTYPE,
  FILES_DOCTYPE
} from '../queries'
import { createRagIndexTriggers } from './ragIndexing'

/** The root folder of the instance: the assistant covers the whole Drive. */
export const ROOT_DIR_ID = 'io.cozy.files.root-dir'

export const isRootDirId = dirId => dirId === ROOT_DIR_ID

export const makeRootKnowledgeBaseEntry = () => ({
  doctype: FILES_DOCTYPE,
  dirId: ROOT_DIR_ID
})

const isFolderEntry = entry => entry.doctype === FILES_DOCTYPE && !!entry.dirId

const hasFolderEntry = knowledgeBase =>
  (knowledgeBase || []).some(isFolderEntry)

/**
 * An assistant always has a knowledge base folder: without one, it covers
 * the whole Drive. Adds the root entry when no folder entry exists,
 * replacing a files entry without dirId (getKnowledgeBaseDirId would find
 * that one first); returns the very same array otherwise.
 */
export const withRootFolderIfMissing = (knowledgeBase = []) =>
  hasFolderEntry(knowledgeBase)
    ? knowledgeBase
    : [
        ...knowledgeBase.filter(entry => entry.doctype !== FILES_DOCTYPE),
        makeRootKnowledgeBaseEntry()
      ]

export const makeKnowledgeBaseEntry = pickedFolder => ({
  doctype: FILES_DOCTYPE,
  dirId: pickedFolder.id
})

export const makeEmailKnowledgeBaseEntry = () => ({ doctype: EMAIL_DOCTYPE })

// Not declared in the schema: cozy-client would hydrate it over the
// deprecated attribute of the same name, and handle it as a referenced_by of
// the files (HasManyFiles).
const KNOWLEDGE_BASE = 'knowledgeBase'

export const hasKnowledgeBaseRelationship = assistant =>
  Array.isArray(assistant?.relationships?.[KNOWLEDGE_BASE]?.data)

/**
 * Reads the relationship, else the deprecated attribute of older assistants.
 * The stack falls back to the attribute only when the relationship has no
 * folder; the relationships saved here always have one.
 */
export const getKnowledgeBase = assistant => {
  if (!hasKnowledgeBaseRelationship(assistant)) {
    return assistant?.knowledgeBase || []
  }
  return HasMany.getHasManyItems(assistant, KNOWLEDGE_BASE).map(
    ({ _id, _type }) =>
      _type === FILES_DOCTYPE
        ? { doctype: _type, dirId: _id }
        : { doctype: _type }
  )
}

/**
 * Also writes the deprecated attribute, for the transition: cozy-client's
 * editAssistant saves the provider relationship only (the stack then falls
 * back to the attribute), and older cozy-search reads only the attribute.
 * The email entry has no id: it stands for every email.
 */
export const withKnowledgeBase = (assistant, knowledgeBase) => {
  const entries = withRootFolderIfMissing(knowledgeBase)
  return HasMany.updateRelationship(
    { ...assistant, knowledgeBase: entries },
    KNOWLEDGE_BASE,
    () => ({
      data: entries.map(entry =>
        entry.dirId
          ? { _id: entry.dirId, _type: entry.doctype }
          : { _type: entry.doctype }
      )
    })
  )
}

export const hasEmailKnowledgeBase = assistant =>
  getKnowledgeBase(assistant).some(entry => entry.doctype === EMAIL_DOCTYPE)

export const withKnowledgeBaseEntry = (knowledgeBase = [], entry) => [
  ...knowledgeBase.filter(e => e.doctype !== entry.doctype),
  entry
]

export const withoutKnowledgeBaseDoctype = (knowledgeBase = [], doctype) =>
  knowledgeBase.filter(e => e.doctype !== doctype)

export const getKnowledgeBaseDirId = assistant =>
  getKnowledgeBase(assistant).find(entry => entry.doctype === FILES_DOCTYPE)
    ?.dirId ?? null

/**
 * `knowledgeBaseOrUpdater` is the new knowledge base, or a function applied
 * to the one of the freshly fetched assistant, so that concurrent changes
 * are not lost. The saved one always has a folder entry (the root when none
 * was chosen); the stack's rag-index worker picks the change up from there,
 * through the rag-index triggers created here when the instance lacks them.
 * A failure to create them is logged: the knowledge base is saved anyway.
 */
export const saveKnowledgeBase = async (
  client,
  assistantId,
  knowledgeBaseOrUpdater
) => {
  const { definition, options } = buildAssistantByIdQuery(assistantId)
  const { data: assistant } = await client.query(definition(), {
    as: options.as
  })
  const knowledgeBase =
    typeof knowledgeBaseOrUpdater === 'function'
      ? knowledgeBaseOrUpdater(getKnowledgeBase(assistant))
      : knowledgeBaseOrUpdater
  await client.save(withKnowledgeBase(assistant, knowledgeBase))
  await createRagIndexTriggers(client).catch(error => {
    // eslint-disable-next-line no-console
    console.warn('cannot set up the rag-index triggers', error)
  })
}
