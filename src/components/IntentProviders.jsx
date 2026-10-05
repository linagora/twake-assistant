import React from 'react'

import { CozyProvider } from 'cozy-client'
import { WebviewIntentProvider } from 'cozy-intent'
import Box from 'cozy-ui/transpiled/react/Box'
import AlertProvider from 'cozy-ui/transpiled/react/providers/Alert'
import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import CozyTheme from 'cozy-ui-plus/dist/providers/CozyTheme'
import { I18n } from 'twake-i18n'

export function IntentProviders({
  client,
  lang,
  polyglot,
  themeType = null,
  children
}) {
  return (
    <WebviewIntentProvider>
      <CozyProvider client={client}>
        <I18n lang={lang} polyglot={polyglot}>
          <CozyTheme
            className="u-w-100 u-h-100"
            type={themeType}
            // The theme the app asks for does not wait for the one of the
            // instance
            ignoreCozySettings={themeType !== null}
          >
            <BreakpointsProvider>
              <AlertProvider>
                {/* The intent paints its background: the one of the app
                    behind its frame may be of another theme */}
                <Box className="u-w-100 u-h-100" bgcolor="background.paper">
                  {children}
                </Box>
              </AlertProvider>
            </BreakpointsProvider>
          </CozyTheme>
        </I18n>
      </CozyProvider>
    </WebviewIntentProvider>
  )
}
