// The order of the stylesheets is their cascade: the utilities override the
// components, the app overrides the libraries
/* eslint-disable import/order */
import React from 'react'

import 'cozy-ui/transpiled/react/stylesheet.css'
import 'cozy-ui/dist/cozy-ui.utils.min.css'
import 'cozy-ui-plus/dist/stylesheet.css'
import 'cozy-search/dist/stylesheet.css'

import { AssistantIntent } from '@/components/Intents/AssistantIntent'
import { setupApp } from '@/targets/browser/setupApp'
import '@/styles/index.styl'
/* eslint-enable import/order */

function init() {
  const { root, client, lang, polyglot } = setupApp()
  const intentId = new URLSearchParams(window.location.search).get('intent')

  root.render(
    <AssistantIntent
      client={client}
      lang={lang}
      polyglot={polyglot}
      intentId={intentId}
    />
  )
}

document.addEventListener('DOMContentLoaded', init)
