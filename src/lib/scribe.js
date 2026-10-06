const PROMPTS = ['summarize', 'improve', 'fix', 'shorten', 'expand']
const LANGUAGES = ['en', 'fr', 'es', 'de', 'it']
/**
 * The prompts about the text of the app, offered above the composer
 *
 * @param {Function} t - translation function
 * @returns {import('cozy-search').Suggestion[]}
 */
export function makeScribeSuggestions(t) {
  return [
    {
      name: 'translate',
      label: t('scribe.suggestions.translate.label'),
      options: LANGUAGES.map(language => ({
        name: language,
        label: t(`scribe.suggestions.translate.${language}.label`),
        prompt: t(`scribe.suggestions.translate.${language}.prompt`)
      }))
    },
    ...PROMPTS.map(name => ({
      name,
      label: t(`scribe.suggestions.${name}.label`),
      prompt: t(`scribe.suggestions.${name}.prompt`)
    }))
  ]
}

/**
 * Joins the text of the app to the first message about it only: the next
 * ones are about the answers, until the app gives another text. Nothing
 * else is added to what the
 * user asks: an instruction on how to answer belongs to the prompt of a
 * suggestion, and would twist a request it was not written for.
 *
 * @param {string} content - the text of the app
 * @param {Function} t - translation function
 * @returns {import('cozy-search').PrepareQuery}
 */
export function makeScribePrepareQuery(content, t) {
  return (text, { isFirstOnText }) =>
    isFirstOnText
      ? `${text}\n\n${t('scribe.content')}\n"""\n${content}\n"""`
      : text
}

/**
 * One button per action of the app under each answer. The app does the
 * action: the scribe only hands it the answer, as a result of the intent.
 *
 * @param {{ name: string, label: string|null }[]} answerActions - the
 * actions of the app, e.g. insert, replace
 * @param {Function} t - translation function
 * @param {Function} onAction - called with { answerAction, text, format }
 * @returns {import('cozy-search').AnswerAction[]}
 */
export function makeScribeAnswerActions(answerActions, t, onAction) {
  return answerActions.map(({ name, label }) => ({
    name,
    // The app names its actions in its own words. Without a label, the
    // scribe has one for insert and replace, and another action keeps its name
    label: label ?? t(`scribe.actions.${name}`, { _: name }),
    onClick: text => onAction({ answerAction: name, text, format: 'markdown' })
  }))
}
