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

export const hasEmailKnowledgeBase = assistant =>
  !!assistant?.knowledgeBase?.some(entry => entry.doctype === EMAIL_DOCTYPE)

export const withKnowledgeBaseEntry = (knowledgeBase = [], entry) => [
  ...knowledgeBase.filter(e => e.doctype !== entry.doctype),
  entry
]

export const withoutKnowledgeBaseDoctype = (knowledgeBase = [], doctype) =>
  knowledgeBase.filter(e => e.doctype !== doctype)

export const getKnowledgeBaseDirId = assistant =>
  assistant?.knowledgeBase?.find(entry => entry.doctype === FILES_DOCTYPE)
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
      ? knowledgeBaseOrUpdater(assistant?.knowledgeBase)
      : knowledgeBaseOrUpdater
  await client.save({
    ...assistant,
    knowledgeBase: withRootFolderIfMissing(knowledgeBase)
  })
  await createRagIndexTriggers(client).catch(error => {
    // eslint-disable-next-line no-console
    console.warn('cannot set up the rag-index triggers', error)
  })
}
