import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useBreakpoints } from 'cozy-ui/transpiled/react/providers/Breakpoints'

import useConversation from '../../hooks/useConversation'
import { useAssistant } from '../AssistantProvider'
import { SidebarDesktop } from './SidebarDesktop'
import { SidebarMobile } from './SidebarMobile'

const Sidebar = ({ className }) => {
  const { createNewConversation } = useConversation()
  const { isOpenSearchConversation, setIsOpenSearchConversation } =
    useAssistant()
  const { isMobile } = useBreakpoints()
  // The desktop sidebar stays open until folded; the mobile menu covers the
  // conversation and is closed until opened, whatever the window was before
  const [isOpenDesktop, setIsOpenDesktop] = useState(true)
  const [isOpenMobile, setIsOpenMobile] = useState(false)
  const sidebarOpen = isMobile ? isOpenMobile : isOpenDesktop
  const setSidebarOpen = isMobile ? setIsOpenMobile : setIsOpenDesktop
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
