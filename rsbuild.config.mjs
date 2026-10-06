import { defineConfig } from '@rsbuild/core'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getRsbuildConfig } from 'rsbuild-config-cozy-app'

import { Ai } from '@linagora/twake-icons'

const config = getRsbuildConfig({
  title: 'Twake Assistant'
})

// The icon of the manifest is rendered from twake-icons, like the one of the bar
const pluginAppIcon = {
  name: 'aiassistant:app-icon',
  setup(api) {
    api.processAssets(
      { stage: 'additional', environments: ['main'] },
      ({ compilation, sources }) => {
        const icon = renderToStaticMarkup(
          createElement(Ai, { width: 32, height: 32 })
        )
        compilation.emitAsset(
          'assets/app-icon.svg',
          new sources.RawSource(icon)
        )
      }
    )
  }
}

export default defineConfig({
  ...config,
  plugins: [...config.plugins, pluginAppIcon]
})
