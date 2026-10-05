const THEME_TYPES = ['light', 'dark']

/**
 * Reads the data of the intent, whatever the app sent: a field that is
 * missing, null or of another type is as if it was not given
 *
 * @param {object|null|undefined} data - the data of the intent
 * @returns {{ theme: { type: 'light'|'dark'|null } }}
 */
export function getIntentConfig(data) {
  const { theme } = data ?? {}

  return {
    theme: { type: THEME_TYPES.includes(theme?.type) ? theme.type : null }
  }
}
