import { useCallback } from 'react'

import { useClient, useQuery } from 'cozy-client'
import { useAlert } from 'cozy-ui/transpiled/react/providers/Alert'
import { useI18n } from 'twake-i18n'

import { useAssistant } from '../AssistantProvider'
import { DEFAULT_ASSISTANT } from '../constants'
import { buildAssistantByIdQuery, buildFileByIdQuery } from '../queries'
import {
  getKnowledgeBaseDirId,
  hasEmailKnowledgeBase,
  isRootDirId,
  makeKnowledgeBaseEntry,
  saveKnowledgeBase,
  withKnowledgeBaseEntry
} from './knowledgeBase'

/**
 * Resolves the selected assistant's knowledge-base sources: the Drive folder
 * (live from io.cozy.files — renames reflected, deletion detected) and the
 * all-or-nothing email source.
 */
export const useSelectedAssistantKnowledgeBase = () => {
  const client = useClient()
  const { t } = useI18n()
  const { showAlert } = useAlert()
  const { selectedAssistantId, setSelectedAssistantId } = useAssistant()
  const realAssistantId =
    selectedAssistantId !== DEFAULT_ASSISTANT._id ? selectedAssistantId : null

  const assistantQuery = buildAssistantByIdQuery(realAssistantId)
  const { data: assistant } = useQuery(
    assistantQuery.definition,
    assistantQuery.options
  )

  const dirId = getKnowledgeBaseDirId(assistant)
  const fileQuery = buildFileByIdQuery(dirId)
  const { data: folder, fetchStatus } = useQuery(
    fileQuery.definition,
    fileQuery.options
  )

  const hasEmail = hasEmailKnowledgeBase(assistant)

  // The folder is gone (or unreadable): its knowledge base cannot be used.
  const isUnavailable =
    !!dirId &&
    (fetchStatus === 'failed' ||
      !!folder?.trashed ||
      !!folder?.path?.startsWith('/.cozy_trash'))

  const setKnowledgeBaseFolder = useCallback(
    async pickedFolder => {
      if (!realAssistantId || !pickedFolder) return
      try {
        await saveKnowledgeBase(client, realAssistantId, kb =>
          withKnowledgeBaseEntry(kb, makeKnowledgeBaseEntry(pickedFolder))
        )
      } catch (_error) {
        showAlert({ message: t('assistant.default_error'), severity: 'error' })
      }
    },
    [client, realAssistantId, showAlert, t]
  )

  // The conversation goes on without the knowledge base: on the sentinel
  // assistant, until the next conversation selects its assistant again
  const removeKnowledgeBase = useCallback(
    () => setSelectedAssistantId(DEFAULT_ASSISTANT._id),
    [setSelectedAssistantId]
  )

  const isRoot = isRootDirId(dirId)
  const folderName = isUnavailable
    ? t('assistant.knowledge_base.unavailable')
    : isRoot
      ? t('assistant.twake_knowledges.drive')
      : (folder?.name ?? '…')

  return {
    assistant: assistant ?? null,
    dirId,
    folder: folder ?? null,
    folderName,
    // A folder the assistant answers from: the whole Drive counts as one
    hasFolder: !!dirId && !isUnavailable,
    isRoot,
    isUnavailable,
    setKnowledgeBaseFolder,
    removeKnowledgeBase,
    isRealAssistant: !!realAssistantId,
    hasEmail
  }
}
