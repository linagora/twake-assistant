import React from 'react'
import { Link, Outlet } from 'react-router-dom'

import { TwakeWorkplace } from '@linagora/twake-icons'
import { BarComponent, BarLeft } from 'cozy-bar'
import { RealTimeQueries } from 'cozy-client'
import { AiText, useAssistantsSetup } from 'cozy-search'
import AppTitle from 'cozy-ui/transpiled/react/AppTitle'
import { Layout } from 'cozy-ui/transpiled/react/Layout'

import styles from '@/components/AppLayout.styl'
import {
  DOCTYPE_AI_CHAT_ASSISTANTS,
  DOCTYPE_AI_CHAT_CONVERSATIONS
} from '@/doctypes'

const AppLayout = () => {
  useAssistantsSetup()

  return (
    <Layout monoColumn>
      <RealTimeQueries doctype={DOCTYPE_AI_CHAT_CONVERSATIONS} />
      <RealTimeQueries doctype={DOCTYPE_AI_CHAT_ASSISTANTS} />
      <BarComponent
        searchOptions={{ enabled: true }}
        appIcon={TwakeWorkplace}
        appTextIcon={AiText}
        componentsProps={{
          Wrapper: {
            className: `u-elevation-0 ${styles['topbar-border']}`
          }
        }}
      />
      <BarLeft>
        <Link to="/" className="coz-nav-apps-btns-home">
          <AppTitle appIcon={TwakeWorkplace} appTextIcon={AiText} />
        </Link>
      </BarLeft>
      <main className={styles['assistant-view']}>
        <Outlet />
      </main>
    </Layout>
  )
}

export default AppLayout
