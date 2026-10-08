import providers from './providers.json'

/** The provider of this id, or a copy of the custom one when none matches. */
export const getSelectedProviderById = providerId => {
  return (
    providers.find(provider => provider.id === providerId) || {
      ...providers.find(provider => provider.id === 'custom')
    }
  )
}

// The custom provider has no name of its own, only a translation key
export const getProviderName = (provider, t) => {
  return provider.id === 'custom' ? t(provider.name) : provider.name
}

/**
 * The display name of a provider, to name its account: resolved against
 * providers.json rather than a selected provider, whose name the dialogs
 * override.
 */
export const getProviderNameById = (providerId, t) => {
  return getProviderName(getSelectedProviderById(providerId), t)
}

export const checkIfModelUnsupported = (provider, model) => {
  const unsupportedModels = provider?.unsupportedModels || []
  return unsupportedModels.includes(model?.trim())
}
