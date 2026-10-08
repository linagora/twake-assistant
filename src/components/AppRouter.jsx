import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'

import { AppLayout } from '@/components/AppLayout'
import AssistantView from '@/components/Views/AssistantView'
import { NewConversation } from '@/components/Views/NewConversation'
import { ASSISTANT_ROUTE_PATH } from '@/lib/conversation'

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ASSISTANT_ROUTE_PATH} element={<AssistantView />} />
          <Route path="*" element={<NewConversation />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
