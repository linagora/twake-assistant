// The order of the stylesheets is their cascade: the utilities override the
// components, the app overrides the libraries
/* eslint-disable import/order */
import React from 'react'

import 'cozy-ui/transpiled/react/stylesheet.css'
import 'cozy-ui/dist/cozy-ui.utils.min.css'
import 'cozy-ui-plus/dist/stylesheet.css'
import 'cozy-bar/dist/stylesheet.css'
import 'cozy-search/dist/stylesheet.css'

import { AppProviders } from '@/components/AppProviders'
import { AppRouter } from '@/components/AppRouter'
import { setupApp } from '@/targets/browser/setupApp'
import '@/styles/index.styl'
/* eslint-enable import/order */

function init() {
  const { root, client, lang, polyglot } = setupApp()

  root.render(
    <AppProviders client={client} lang={lang} polyglot={polyglot}>
      <AppRouter />
    </AppProviders>
  )
}

document.addEventListener('DOMContentLoaded', init)
