const THEME_TYPES = ['light', 'dark']

function isAnswerAction(action) {
  return typeof action?.name === 'string' && action.name !== ''
}

/**
 * Reads the data of the intent, whatever the app sent: a field that is
 * missing, null or of another type is as if it was not given
 *
 * @param {object|null|undefined} data - the data of the intent
 * @returns {{
 *   content: string,
 *   answerActions: { name: string, label: string|null }[],
 *   theme: { type: 'light'|'dark'|null }
 * }}
 */
export function getIntentConfig(data) {
  const { content, answerActions, theme } = data ?? {}

  return {
    content: typeof content === 'string' ? content : '',
    answerActions: Array.isArray(answerActions)
      ? answerActions.filter(isAnswerAction).map(({ name, label }) => ({
          name,
          label: typeof label === 'string' && label !== '' ? label : null
        }))
      : [],
    theme: { type: THEME_TYPES.includes(theme?.type) ? theme.type : null }
  }
}
