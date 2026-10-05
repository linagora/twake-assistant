import { createRoot } from 'react-dom/client'

import CozyClient from 'cozy-client'
import flag from 'cozy-flags'
import { RealtimePlugin } from 'cozy-realtime'
import { initTranslation } from 'twake-i18n'

import manifest from '../../../manifest.webapp'

import { schema } from '@/doctypes'

function makeClient(container) {
  const data = JSON.parse(container.dataset.cozy)
  const protocol = window.location.protocol
  const cozyUrl = `${protocol}//${data.domain}`

  return new CozyClient({
    uri: cozyUrl,
    token: data.token,
    appMetadata: {
      slug: manifest.slug,
      version: manifest.version
    },
    schema,
    store: true
  })
}

// The stack fills the template: an unfilled {{.Value}} means it did not
function getDataOrDefault(data, defaultData) {
  return /^\{\{\..*\}\}$/.test(data) ? defaultData : data
}

export function setupApp() {
  const container = document.querySelector('[role=application]')
  const root = createRoot(container)
  const client = makeClient(container)
  const locale = JSON.parse(container.dataset.cozy)?.locale
  const lang = getDataOrDefault(locale, 'en')
  const polyglot = initTranslation(lang, lang => require(`@/locales/${lang}`))
  client.registerPlugin(flag.plugin)
  client.registerPlugin(RealtimePlugin)

  return { root, client, lang, polyglot }
}
