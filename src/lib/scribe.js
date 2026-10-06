import catalogue from '@/lib/scribePrompts.json'

// The prompts of the scribe are the ones of the catalogue of linagora/ai-prompts
// (https://files.twake.app/prompts/scribe/latest.json), shared with the scribe
// of Twake Mail, and arranged as in its menu
const SUGGESTIONS = [
  { name: 'correct', prompt: 'correct-grammar' },
  {
    name: 'improve',
    options: [
      { name: 'shorter', prompt: 'make-shorter' },
      { name: 'expand', prompt: 'expand-context' },
      { name: 'emojify', prompt: 'emojify' },
      { name: 'bullets', prompt: 'transform-to-bullets' }
    ]
  },
  {
    name: 'tone',
    options: [
      { name: 'professional', prompt: 'change-tone-professional' },
      { name: 'casual', prompt: 'change-tone-casual' },
      { name: 'polite', prompt: 'change-tone-polite' }
    ]
  },
  {
    name: 'translate',
    options: [
      { name: 'french', prompt: 'translate-french' },
      { name: 'english', prompt: 'translate-english' },
      { name: 'russian', prompt: 'translate-russian' },
      { name: 'vietnamese', prompt: 'translate-vietnamese' }
    ]
  },
  { name: 'summarize', prompt: 'summarize' }
]

/**
 * @typedef {object} Suggestion
 * @property {string} name
 * @property {string} label - the label of its chip or of its item
 * @property {string} [request] - the request shown in the conversation
 * @property {string} [prompt] - the name of its prompt in the catalogue
 * @property {Suggestion[]} [options] - the items of its menu
 */

/**
 * The prompts about the text of the app, offered above the composer
 *
 * @param {Function} t - translation function
 * @returns {Suggestion[]}
 */
export function makeScribeSuggestions(t) {
  const makeSuggestion = (suggestion, path) => {
    const key = `scribe.suggestions.${[...path, suggestion.name].join('.')}`
    if (suggestion.options) {
      return {
        name: suggestion.name,
        label: t(`${key}.label`),
        options: suggestion.options.map(option =>
          makeSuggestion(option, [...path, suggestion.name])
        )
      }
    }
    return {
      name: suggestion.name,
      label: t(`${key}.label`),
      request: t(`${key}.request`),
      prompt: suggestion.prompt
    }
  }

  return SUGGESTIONS.map(suggestion => makeSuggestion(suggestion, []))
}

/**
 * Builds the request of a prompt of the catalogue on the text of the app:
 * its system message is sent as the instructions, and its user message,
 * with the text in place of `{{input}}`, as the query
 *
 * @param {string} content - the text of the app
 * @returns {(name: string) => { q: string, instructions: string|null }|null}
 * null for a prompt the catalogue does not have
 */
export function makeScribePreparePrompt(content) {
  return name => {
    const prompt = catalogue.prompts.find(item => item.name === name)
    if (!prompt) return null

    const getContent = role =>
      prompt.messages.find(message => message.role === role)?.content ?? null
    const template = getContent('user')
    if (template === null) return null

    return {
      // A function as replacement: a `$` of the text is not a pattern
      q: template.replace(/\{\{\s*input\s*\}\}/g, () => content),
      instructions: getContent('system')
    }
  }
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
