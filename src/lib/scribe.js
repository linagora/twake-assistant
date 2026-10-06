import { CATALOGUE_SUGGESTION } from '@/lib/intent'
import catalogue from '@/lib/scribePrompts.json'

// The stack takes at most 5 examples per action
const MAX_EXAMPLES = 5

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
 * @property {string} [instructions] - how to answer the request, for a
 * request of the app
 * @property {Suggestion[]} [options] - the items of its menu
 */

/**
 * The prompts of the default menu, offered above the composer
 *
 * @param {Function} t - translation function
 * @returns {Suggestion[]}
 */
function makeCatalogueSuggestions(t) {
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

function findSuggestion(suggestions, predicate) {
  for (const suggestion of suggestions) {
    if (predicate(suggestion)) return suggestion
    const found = suggestion.options
      ? findSuggestion(suggestion.options, predicate)
      : null
    if (found) return found
  }
  return null
}

/**
 * The suggestions above the composer: the default menu of the scribe, or
 * the ones the app asks for, in its words. A suggestion of the app sends a
 * prompt of the catalogue, a request for one of its capabilities, or a
 * request of its own; `catalogue` puts the default menu in its place.
 *
 * @param {Function} t - translation function
 * @param {import('@/lib/intent').SuggestionConfig[]|null} [config] - the
 * suggestions of the app, null for the default menu
 * @param {{ name: string, label: string }[]} [capabilities] - the
 * capabilities of the app, which name a request for them
 * @returns {Suggestion[]}
 */
export function makeScribeSuggestions(t, config = null, capabilities = []) {
  const defaults = makeCatalogueSuggestions(t)
  if (config === null) return defaults

  const makeSuggestion = suggestion => {
    if (suggestion.options) {
      return {
        name: suggestion.name,
        label: suggestion.label ?? suggestion.name,
        options: suggestion.options.flatMap(makeSuggestion)
      }
    }
    if (suggestion.prompt) {
      // A prompt of the default menu keeps its words unless the app gives
      // its own
      const known = findSuggestion(
        defaults,
        item => item.prompt === suggestion.prompt
      )
      return {
        name: suggestion.name,
        label: suggestion.label ?? known?.label ?? suggestion.prompt,
        request: suggestion.message ?? known?.request ?? suggestion.prompt,
        prompt: suggestion.prompt
      }
    }
    const capability = capabilities.find(
      item => item.name === suggestion.capability
    )
    return {
      name: suggestion.name,
      label: suggestion.label ?? capability?.label ?? suggestion.name,
      request: suggestion.message,
      ...(suggestion.instructions && { instructions: suggestion.instructions })
    }
  }

  return config.flatMap(suggestion =>
    suggestion.name === CATALOGUE_SUGGESTION
      ? defaults
      : makeSuggestion(suggestion)
  )
}

/**
 * The requests the suggestions make for a capability: given to the router
 * as examples of it, so that it picks the capability for them
 *
 * @param {import('@/lib/intent').SuggestionConfig[]|null} suggestions
 * @param {string} name - the capability
 * @returns {string[]}
 */
function findRequestsFor(suggestions, name) {
  return (suggestions ?? []).flatMap(suggestion => {
    if (suggestion.options) return findRequestsFor(suggestion.options, name)
    return suggestion.capability === name && suggestion.message
      ? [suggestion.message]
      : []
  })
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

/**
 * @typedef {object} ScribeCapability
 * @property {string} name
 * @property {string} label - the button of the card of a proposed call
 * @property {boolean} confirm - whether the user confirms a call first
 * @property {boolean} hasContent - whether the call takes the answer as its
 * content
 * @property {object} action - its definition as a chat action of the stack
 * @property {(params: object, text?: string) => void} onClick - hands the
 * call to the app, with the answer for a capability with a content
 */

/**
 * The capabilities of the app, which the LLM may propose to call with the
 * params it fills, or the content it writes. The app makes the call: the
 * scribe hands it the name, the params and the content, as a result of the
 * intent, once the user has confirmed them when the app asks for it.
 *
 * @param {import('@/lib/intent').Capability[]} capabilities
 * @param {Function} t - translation function
 * @param {Function} onCall - called with { capability, params, text, format }
 * @param {import('@/lib/intent').SuggestionConfig[]|null} [suggestions] -
 * the suggestions of the app: their requests for a capability are examples
 * of it
 * @returns {ScribeCapability[]}
 */
export function makeScribeCapabilities(
  capabilities,
  t,
  onCall,
  suggestions = null
) {
  return capabilities.map(({ name, label, confirm, action }) => {
    const examples = action.examples ?? []
    const requests = findRequestsFor(suggestions, name)
      .filter(message => !examples.some(example => example.message === message))
      .map(message => ({ message, needs_documents: false }))
    const hasContent = action.content !== undefined

    return {
      name,
      label: label ?? t('scribe.capabilities.run'),
      confirm,
      hasContent,
      action: {
        ...action,
        ...(requests.length > 0 && {
          examples: [...examples, ...requests].slice(0, MAX_EXAMPLES)
        })
      },
      onClick: (params, text = '') =>
        onCall({
          capability: name,
          params,
          ...(hasContent && { text, format: 'markdown' })
        })
    }
  })
}
