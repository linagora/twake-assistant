import React from 'react'

import { BarProvider } from 'cozy-bar'
import { CozyProvider } from 'cozy-client'
import { DataProxyProvider } from 'cozy-dataproxy-lib'
import { WebviewIntentProvider } from 'cozy-intent'
import AlertProvider from 'cozy-ui/transpiled/react/providers/Alert'
import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import CozyTheme from 'cozy-ui-plus/dist/providers/CozyTheme'
import { I18n } from 'twake-i18n'

const AppProviders = ({ client, lang, polyglot, children }) => {
  return (
    <WebviewIntentProvider>
      <CozyProvider client={client}>
        <DataProxyProvider>
          <BarProvider>
            <I18n lang={lang} polyglot={polyglot}>
              <CozyTheme className="u-w-100">
                <BreakpointsProvider>
                  <AlertProvider>{children}</AlertProvider>
                </BreakpointsProvider>
              </CozyTheme>
            </I18n>
          </BarProvider>
        </DataProxyProvider>
      </CozyProvider>
    </WebviewIntentProvider>
  )
}

export default AppProviders
