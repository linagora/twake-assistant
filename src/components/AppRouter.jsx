import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'

import { BarRoutes } from 'cozy-bar'
import { AssistantView } from 'cozy-search'

import { AppLayout } from '@/components/AppLayout'
import { NewConversation } from '@/components/Views/NewConversation'

export const ASSISTANT_ROUTE_PATH = 'assistant/:conversationId'

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
