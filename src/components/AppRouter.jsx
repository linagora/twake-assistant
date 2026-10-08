import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'

import { BarRoutes } from 'cozy-bar'

import { AppLayout } from '@/components/AppLayout'
import AssistantView from '@/components/Views/AssistantView'
import { NewConversation } from '@/components/Views/NewConversation'
import { ASSISTANT_ROUTE_PATH } from '@/lib/conversation'

// The assistant has its own route here, not the dialog of the cozy-bar
const barRoutes = BarRoutes.filter(
  route => route.props?.path !== ASSISTANT_ROUTE_PATH
)

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ASSISTANT_ROUTE_PATH} element={<AssistantView />} />
          {barRoutes}
          <Route path="*" element={<NewConversation />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
