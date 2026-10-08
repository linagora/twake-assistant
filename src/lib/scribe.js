import { CheckList, Globe, Text, TextInfo } from '@linagora/twake-icons'

import { findExampleError } from '@/lib/chatActions'
import { DEFAULT_MENU_SUGGESTION } from '@/lib/intent'
import { removeSourceMarks } from '@/lib/scribeChat'
import catalogue from '@/lib/scribePrompts.json'

// The prompts of the scribe are the ones of the catalogue of linagora/ai-prompts
// (https://files.twake.app/prompts/scribe/latest.json), shared with the scribe
// of Twake Mail, arranged as in the design of the side panel
const SUGGESTIONS = [
  { name: 'summarize', icon: Text, prompt: 'summarize' },
  { name: 'correct', icon: TextInfo, prompt: 'correct-grammar' },
  { name: 'keypoints', icon: CheckList, prompt: 'transform-to-bullets' },
  {
    name: 'translate',
    icon: Globe,
    options: [
      { name: 'french', prompt: 'translate-french' },
      { name: 'english', prompt: 'translate-english' },
      { name: 'russian', prompt: 'translate-russian' },
      { name: 'vietnamese', prompt: 'translate-vietnamese' }
    ]
  }
]

/**
 * @typedef {object} Suggestion
 * @property {string} name
 * @property {string} label - the label of its chip or of its item
 * @property {Function} [icon] - the icon of its chip, from twake-icons
 * @property {string} [request] - the request shown in the conversation
 * @property {string} [prompt] - the name of its prompt in the catalogue
 * @property {string} [instructions] - the system message of a request of
 * the app
 * @property {Suggestion[]} [options] - the items of its menu
 */

function makeDefaultMenu(t) {
  const makeSuggestion = (suggestion, path) => {
    const key = `scribe.suggestions.${[...path, suggestion.name].join('.')}`
    if (suggestion.options) {
      return {
        name: suggestion.name,
        label: t(`${key}.label`),
        icon: suggestion.icon,
        options: suggestion.options.map(option =>
          makeSuggestion(option, [...path, suggestion.name])
        )
      }
    }
    return {
      name: suggestion.name,
      label: t(`${key}.label`),
      icon: suggestion.icon,
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
 * The chips above the composer: the default menu, or the suggestions of the
 * app. A suggestion without a label takes the one of its prompt in the
 * default menu, or of its capability.
 *
 * @param {Function} t - translation function
 * @param {import('@/lib/intent').SuggestionConfig[]|null} [config] - null
 * for the default menu
 * @param {{ name: string, label: string }[]} [capabilities]
 * @returns {Suggestion[]}
 */
export function makeScribeSuggestions(t, config = null, capabilities = []) {
  const defaults = makeDefaultMenu(t)
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
    suggestion.name === DEFAULT_MENU_SUGGESTION
      ? defaults
      : makeSuggestion(suggestion)
  )
}

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

// The text of the app as makeScribePrepareQuery joins it, in any language
const JOINED_TEXT = /\n\n[^\n]*\n"""\n[\s\S]*\n"""$/
// A prompt of the catalogue, even one written before its current version:
// its first instruction stands for it
const CATALOGUE_QUERY = /^INSTRUCTION:\n([^\n]+)\n[\s\S]*\nTEXT:\n/

// Each prompt of the catalogue, with the pattern of the queries it makes
const PROMPT_PATTERNS = catalogue.prompts.flatMap(prompt => {
  const template = prompt.messages.find(
    message => message.role === 'user'
  )?.content
  if (!template) return []

  const pattern = template
    .split(/\{\{\s*input\s*\}\}/)
    .map(piece => piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s\\S]*')
  return [{ prompt, pattern: new RegExp(`^${pattern}$`) }]
})

/**
 * The request a message of a past conversation shows. The stack keeps the
 * query sent to the LLM: the prompt of a chip, or the request with the text
 * of the app.
 *
 * @param {string} query - the content of the message kept by the stack
 * @param {Function} t - translation function
 * @returns {string}
 */
export function getScribeRequest(query, t) {
  const prompt = PROMPT_PATTERNS.find(({ pattern }) =>
    pattern.test(query)
  )?.prompt
  if (!prompt) {
    return query.match(CATALOGUE_QUERY)?.[1] ?? query.replace(JOINED_TEXT, '')
  }

  const known = findSuggestion(
    makeDefaultMenu(t),
    item => item.prompt === prompt.name
  )
  return known?.request ?? prompt.description
}

/**
 * The messages of a past conversation, as the scribe shows them
 *
 * @param {object[]} messages - the messages of the conversation kept by the
 * stack
 * @param {Function} t - translation function
 * @returns {import('@assistant-ui/react').ThreadMessageLike[]}
 */
export function makeScribeMessages(messages, t) {
  return messages
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .map(message => {
      if (message.role === 'user') {
        return {
          id: message.id,
          role: 'user',
          content: getScribeRequest(message.content, t)
        }
      }

      const text = removeSourceMarks(message.content ?? '')
      return {
        id: message.id,
        role: 'assistant',
        content: message.reasoning
          ? [
              { type: 'reasoning', text: removeSourceMarks(message.reasoning) },
              { type: 'text', text }
            ]
          : text,
        metadata: {
          custom: {
            isPast: true,
            ...(text.trim() === '' && !message.action && { isEmpty: true }),
            ...(message.sources?.length > 0 && { sources: message.sources }),
            ...(message.action && { action: message.action })
          }
        }
      }
    })
}

/**
 * @param {object} conversation - a conversation kept by the stack
 * @param {Function} t - translation function
 * @returns {string} its name, or its first request
 */
export function getScribeConversationTitle(conversation, t) {
  if (conversation.name) return conversation.name

  const request = conversation.messages?.find(
    message => message.role === 'user'
  )
  return request ? getScribeRequest(request.content, t) : ''
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
 * @property {string} label
 * @property {boolean} confirm
 * @property {boolean} hasContent - whether the call takes the answer as its
 * text
 * @property {object} action - its definition as a chat action of cozy-stack
 * @property {(params: object, text?: string) => void} onClick
 */

/**
 * @param {import('@/lib/intent').Capability[]} capabilities
 * @param {Function} t - translation function
 * @param {Function} onCall - called with the result of the intent,
 * { capability, params, text, format }
 * @param {import('@/lib/intent').SuggestionConfig[]|null} [suggestions]
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
    // The router picks a capability from its examples: the request of a chip
    // that asks for it is one, so that the chip gets the capability
    const requests = findRequestsFor(suggestions, name)
      .filter(message => !examples.some(example => example.message === message))
      .map(message => ({ message, needs_documents: false }))
      .filter(example => findExampleError(example) === null)
    const hasContent = action.content !== undefined

    return {
      name,
      label: label ?? t('scribe.capabilities.run'),
      confirm,
      hasContent,
      action: {
        ...action,
        ...(requests.length > 0 && {
          examples: [...examples, ...requests]
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
