import React, { useMemo, useContext, useState } from 'react'

import { DEFAULT_ASSISTANT } from './constants'

export const AssistantContext = React.createContext()

/**
 * @returns {import('./AssistantProvider').AssistantContextValue}
 */
export const useAssistant = () => {
  const context = useContext(AssistantContext)

  if (!context) {
    throw new Error('useAssistant must be used within a AssistantProvider')
  }
  return context
}

const AssistantProvider = ({ children }) => {
  const [isOpenCreateAssistant, setIsOpenCreateAssistant] = useState(false)
  const [isOpenDeleteAssistant, setIsOpenDeleteAssistant] = useState(false)
  const [isOpenEditAssistant, setIsOpenEditAssistant] = useState(false)
  const [assistantIdInAction, setAssistantIdInAction] = useState(null)
  const [selectedAssistantId, setSelectedAssistantId] = useState(
    DEFAULT_ASSISTANT._id
  )
  const [isOpenSearchConversation, setIsOpenSearchConversation] =
    useState(false)
  const [websearchEnabled, setWebsearchEnabled] = useState(false)
  // The sources panel beside the conversations of desktop, open until the
  // user closes it. The mobile one covers the conversation: each
  // conversation keeps its own, closed until asked for.
  const [isOpenSources, setIsOpenSources] = useState(true)

  const value = useMemo(
    () => ({
      isOpenCreateAssistant,
      isOpenDeleteAssistant,
      isOpenEditAssistant,
      assistantIdInAction,
      selectedAssistantId,
      isOpenSearchConversation,
      setAssistantIdInAction,
      setIsOpenDeleteAssistant,
      setIsOpenCreateAssistant,
      setIsOpenEditAssistant,
      setSelectedAssistantId,
      setIsOpenSearchConversation,
      websearchEnabled,
      setWebsearchEnabled,
      isOpenSources,
      setIsOpenSources
    }),
    [
      isOpenCreateAssistant,
      isOpenDeleteAssistant,
      isOpenEditAssistant,
      assistantIdInAction,
      selectedAssistantId,
      isOpenSearchConversation,
      websearchEnabled,
      isOpenSources
    ]
  )

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  )
}

export default React.memo(AssistantProvider)
