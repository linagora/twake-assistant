import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useBreakpoints } from 'cozy-ui/transpiled/react/providers/Breakpoints'

import { SidebarDesktop } from './SidebarDesktop'
import { SidebarMobile } from './SidebarMobile'
import useConversation from '../../hooks/useConversation'
import { useAssistant } from '../AssistantProvider'

const Sidebar = ({ className }) => {
  const { createNewConversation } = useConversation()
  const { isOpenSearchConversation, setIsOpenSearchConversation } =
    useAssistant()
  const { isMobile } = useBreakpoints()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const { key } = useLocation()
  const [locationKey, setLocationKey] = useState(key)

  // The mobile menu covers the conversation: whatever it opens, a
  // conversation or a new one, closes it
  if (key !== locationKey) {
    setLocationKey(key)
    if (isMobile) setSidebarOpen(false)
  }

  const onToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const onCloseSidebar = () => {
    setSidebarOpen(false)
  }

  const onToggleSearch = () => {
    setIsOpenSearchConversation(!isOpenSearchConversation)
  }

  if (isMobile) {
    return (
      <SidebarMobile
        className={className}
        open={sidebarOpen}
        onToggle={onToggleSidebar}
        onClose={onCloseSidebar}
        onToggleSearch={onToggleSearch}
        onCreateNewConversation={createNewConversation}
      />
    )
  }

  return (
    <SidebarDesktop
      className={className}
      open={sidebarOpen}
      onToggle={onToggleSidebar}
      onToggleSearch={onToggleSearch}
      onCreateNewConversation={createNewConversation}
    />
  )
}

export default Sidebar
