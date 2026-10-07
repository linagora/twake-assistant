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
                {/* The intent paints its background and its text: the app
                    behind its frame may be of another theme, and the browser
                    gives a raw element the text color of the scheme of the
                    system (color-scheme of the page), not of the theme */}
                <Box
                  className="u-w-100 u-h-100"
                  bgcolor="background.paper"
                  color="text.primary"
                >
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
