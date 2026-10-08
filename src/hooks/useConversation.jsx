import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAssistant } from '../components/AssistantProvider'
import { makeConversationId } from '../components/helpers'

const useConversation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { setIsOpenSearchConversation } = useAssistant()

  // `navigate` and `location` change on every navigation: kept in refs,
  // they leave `goToConversation` stable, which `React.memo` on the
  // conversation list items needs to skip re-renders on a switch.
  const navigateRef = useRef(navigate)
  const locationRef = useRef(location)
  useEffect(() => {
    navigateRef.current = navigate
    locationRef.current = location
  }, [navigate, location])

  /**
   * Opens a conversation. `assistantId` is the assistant a new conversation
   * starts on, carried in the history state: without it, a new conversation
   * starts on the configured default.
   */
  const goToConversation = useCallback(
    (conversationId, { assistantId } = {}) => {
      const loc = locationRef.current
      // The path before '/assistant', if any
      const match = loc.pathname.match(/^(.*?)(\/assistant(\/|$).*|$)/)
      const basePath = (match?.[1] ?? loc.pathname).replace(/\/$/, '')
      const newPathname = `${basePath}/assistant/${conversationId}`

      setIsOpenSearchConversation(false)

      const to = {
        pathname: newPathname,
        search: loc.search,
        hash: loc.hash
      }
      if (assistantId) {
        navigateRef.current(to, { state: { assistantId } })
      } else {
        navigateRef.current(to)
      }
    },
    [setIsOpenSearchConversation]
  )

  const createNewConversation = useCallback(
    assistantId => {
      goToConversation(makeConversationId(), {
        assistantId: typeof assistantId === 'string' ? assistantId : undefined
      })
    },
    [goToConversation]
  )

  return {
    goToConversation,
    createNewConversation
  }
}

export default useConversation
