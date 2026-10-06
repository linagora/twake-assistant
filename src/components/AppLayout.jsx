import React from 'react'
import { Outlet } from 'react-router-dom'

import { Ai } from '@linagora/twake-icons'
import { BarComponent } from 'cozy-bar'
import { RealTimeQueries } from 'cozy-client'
import { AiText, useAssistantsSetup } from 'cozy-search'
import { Layout } from 'cozy-ui/transpiled/react/Layout'

import styles from '@/components/AppLayout.styl'
import {
  DOCTYPE_AI_CHAT_ASSISTANTS,
  DOCTYPE_AI_CHAT_CONVERSATIONS
} from '@/doctypes'

export function AppLayout() {
  useAssistantsSetup()

  return (
    <Layout monoColumn>
      <RealTimeQueries doctype={DOCTYPE_AI_CHAT_CONVERSATIONS} />
      <RealTimeQueries doctype={DOCTYPE_AI_CHAT_ASSISTANTS} />
      <BarComponent
        appIcon={Ai}
        appTextIcon={AiText}
        componentsProps={{
          Wrapper: {
            className: `u-elevation-0 ${styles['topbar-border']}`
          }
        }}
      />
      <main className={styles['assistant-view']}>
        <Outlet />
      </main>
    </Layout>
  )
}
