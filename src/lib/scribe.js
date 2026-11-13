import {
  CheckList,
  Comment,
  Globe,
  Pen,
  Text,
  TextInfo
} from '@linagora/twake-icons'

import { removeSourceMarks, toPlainText } from '@/lib/chat'
import { findExampleError } from '@/lib/chatActions'
import { DEFAULT_MENU_SUGGESTION } from '@/lib/intent'
import { removeInsertFences } from '@/lib/scribeBlocks'
import catalogue from '@/lib/scribePrompts.json'

// The prompts of the scribe are the ones of the catalogue of linagora/ai-prompts
// (https://files.twake.app/prompts/scribe/latest.json), shared with the scribe
// of Twake Mail, arranged as in the design of the side panel. A prompt the
// catalogue does not have yet is left out, until `yarn prompts:update` brings it.
const SUGGESTIONS = [
  { name: 'summarize', icon: Text, prompt: 'summarize' },
  { name: 'correct', icon: TextInfo, prompt: 'correct-grammar' },
  { name: 'keypoints', icon: CheckList, prompt: 'transform-to-bullets' },
  {
    name: 'rewrite',
    icon: Pen,
    options: [
      { name: 'shorter', prompt: 'make-shorter' },
      { name: 'longer', prompt: 'expand-context' }
    ]
  },
  {
    name: 'tone',
    icon: Comment,
    options: [
      { name: 'professional', prompt: 'change-tone-professional' },
      { name: 'casual', prompt: 'change-tone-casual' },
      { name: 'polite', prompt: 'change-tone-polite' }
    ]
  },
  {
    name: 'translate',
    icon: Globe,
    options: [
      { name: 'french', prompt: 'translate-french' },
      { name: 'english', prompt: 'translate-english' },
      { name: 'german', prompt: 'translate-german' },
      { name: 'spanish', prompt: 'translate-spanish' },
      { name: 'italian', prompt: 'translate-italian' },
      { name: 'russian', prompt: 'translate-russian' },
      { name: 'vietnamese', prompt: 'translate-vietnamese' }
    ]
  }
]

const isInCatalogue = name =>
  catalogue.prompts.some(prompt => prompt.name === name)

function keepCatalogued(suggestions) {
  return suggestions.flatMap(suggestion => {
    if (!suggestion.options) {
      return isInCatalogue(suggestion.prompt) ? [suggestion] : []
    }
    const options = keepCatalogued(suggestion.options)
    return options.length > 0 ? [{ ...suggestion, options }] : []
  })
}

const SHORT_ACTIONS = [
  { name: 'translate', icon: Globe },
  { name: 'correct', icon: TextInfo },
  { name: 'write', icon: Pen }
]

// The short actions on a folder. The icons are those of the same prompts in
// the scribe.
export const FOLDER_ACTIONS = [
  { name: 'summarize', icon: Text },
  { name: 'find_decision', icon: TextInfo },
  { name: 'translate', icon: Globe },
  { name: 'key_points', icon: CheckList }
]

/**
 * @typedef {object} Suggestion
 * @property {string} name
 * @property {string} label - the label of its chip or of its item
 * @property {Function} [icon] - the icon of its chip, from twake-icons
 * @property {string} [request] - the request shown in the conversation
 * @property {string} [draft] - put in the composer for the user to
 * complete, in place of a request sent at once
 * @property {string} [running] - what the scribe shows it does while it
 * answers
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
      running: t(`${key}.running`),
      prompt: suggestion.prompt
    }
  }

  return keepCatalogued(SUGGESTIONS).map(suggestion =>
    makeSuggestion(suggestion, [])
  )
}

/**
 * The chips of the scribe without a text: short actions that start a
 * request in the composer
 *
 * @param {Function} t - translation function
 * @param {object[]} [actions] - those on the Drive: FOLDER_ACTIONS
 * @returns {Suggestion[]}
 */
export function makeScribeShortActions(t, actions = SHORT_ACTIONS) {
  return actions.map(({ name, icon }) => ({
    name,
    icon,
    label: t(`assistant.welcome.actions.${name}.label`),
    draft: t(`assistant.welcome.actions.${name}.prompt`)
  }))
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
 * What the scribe shows it does while it answers a request
 *
 * @param {string|null} prompt - the prompt of the request, null for a
 * request the user typed
 * @param {Function} t - translation function
 * @returns {string}
 */
export function getRunningLabel(prompt, t) {
  const known = prompt
    ? findSuggestion(makeDefaultMenu(t), item => item.prompt === prompt)
    : null
  return known?.running ?? t('scribe.processing')
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

/**
 * The welcome and the placeholder of the scribe. Without a text, they are
 * those of the assistant.
 */
export function getScribeWording(t, { hasText, hasDocuments }) {
  if (hasText) {
    return {
      welcome: t('scribe.welcome'),
      placeholder: t('scribe.placeholder')
    }
  }
  if (!hasDocuments) {
    return {
      welcome: t('assistant.welcome.default_subtitle'),
      placeholder: t('assistant.search.placeholder')
    }
  }
  return {
    welcome: t('assistant.welcome.folder_subtitle'),
    placeholder: t('assistant.search.placeholder_folder')
  }
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
 * ones are about the answers, until the app gives another text. The whole
 * document, when the user includes it, goes before the request. Nothing
 * else is added to what the
 * user asks: an instruction on how to answer belongs to the prompt of a
 * suggestion, and would twist a request it was not written for.
 *
 * @param {string} content - the text of the app
 * @param {Function} t - translation function
 * @returns {(text: string, options: { isFirstOnText: boolean, document?: string|null }) => string}
 */
export function makeScribePrepareQuery(content, t) {
  return (text, { isFirstOnText, document = null }) => {
    const request =
      isFirstOnText && content !== ''
        ? `${text}\n\n${t('scribe.content')}\n"""\n${content}\n"""`
        : text
    return document
      ? `[Full document]\n${document}\n[End of full document]\n\n${request}`
      : request
  }
}

// The document as makeScribePrepareQuery puts it before the request
const FULL_DOCUMENT =
  /^\[Full document\]\n[\s\S]*\n\[End of full document\]\n\n/
// The text of the app as makeScribePrepareQuery joins it, in any language
const JOINED_TEXT = /\n\n[^\n]*\n"""\n([\s\S]*)\n"""$/
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
    .join('([\\s\\S]*)')
  return [{ prompt, pattern: new RegExp(`^${pattern}$`) }]
})

function matchPrompt(query) {
  for (const { prompt, pattern } of PROMPT_PATTERNS) {
    const match = query.match(pattern)
    if (match) return { prompt, input: match[1] ?? null }
  }
  return null
}

/**
 * The request a message of a past conversation shows. The stack keeps the
 * query sent to the LLM: the prompt of a chip, or the request with the
 * document and the text of the app.
 *
 * @param {string} query - the content of the message kept by the stack
 * @param {Function} t - translation function
 * @returns {string}
 */
export function getScribeRequest(query, t) {
  const prompt = matchPrompt(query)?.prompt
  if (!prompt) {
    const request = query.replace(FULL_DOCUMENT, '')
    return (
      request.match(CATALOGUE_QUERY)?.[1] ?? request.replace(JOINED_TEXT, '')
    )
  }

  const known = findSuggestion(
    makeDefaultMenu(t),
    item => item.prompt === prompt.name
  )
  return known?.request ?? prompt.description
}

function getScribeSelection(query) {
  const matched = matchPrompt(query)
  const selection = matched
    ? matched.input
    : query.replace(FULL_DOCUMENT, '').match(JOINED_TEXT)?.[1]
  return selection && selection.trim() !== '' ? selection : null
}

/**
 * The messages of a past conversation, as the assistant shows them
 *
 * @param {object[]} messages - the messages of the conversation kept by the
 * stack
 * @param {Function} t - translation function
 * @returns {import('@assistant-ui/react').ThreadMessageLike[]}
 */
export function makeChatMessages(messages, t) {
  return messages
    .filter(message => message.role === 'user' || message.role === 'assistant')
    .map(message => {
      if (message.role === 'user') {
        const selection = getScribeSelection(message.content)
        return {
          id: message.id,
          role: 'user',
          content: getScribeRequest(message.content, t),
          ...(selection !== null && { metadata: { custom: { selection } } })
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
            ...(message.action && {
              action: { ...message.action, messageId: message.id }
            })
          }
        }
      }
    })
}

/**
 * @param {object} conversation - a conversation kept by the stack
 * @returns {string} its last answer: while an answer goes on, the last
 * message is the query sent to the LLM, with the text of the app
 */
export function getScribeConversationDescription(conversation) {
  const answer = conversation.messages?.findLast(
    message => message.role === 'assistant'
  )
  // The text of an insert block is Markdown, not code: its syntax goes too
  return toPlainText(removeInsertFences(answer?.content ?? ''))
}

/**
 * @typedef {object} AnswerAction
 * @property {string} name
 * @property {string} label - the label of its button
 * @property {(text: string) => void} onClick - called with the answer
 */

/**
 * One button per action of the app under each answer. The app does the
 * action: the scribe only hands it the answer, as a result of the intent.
 *
 * @param {{ name: string, label: string|null }[]} answerActions - the
 * actions of the app, e.g. insert, replace
 * @param {Function} t - translation function
 * @param {Function} onAction - called with { answerAction, text, format }
 * @returns {AnswerAction[]}
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
 * @property {boolean} hasReason - whether the LLM writes why it calls it in
 * the `reason` param, which the app does not get
 * @property {object} action - its definition as a chat action of cozy-stack
 * @property {(params: object, text?: string, messageId?: string|null) => void} onClick
 */

export const REASON_PARAM = 'reason'

const REASON_SCHEMA = {
  type: 'string',
  description:
    'One short sentence for the user, in the language of the user, that tells what you do with this call and why, like: I search the emails of the customer to find what was done.'
}

// The LLM tells the user what it does through a param it must fill: a model
// that calls a tool writes no text next to the call. A tool of the app that
// has a param of this name keeps it as it is.
function withReason(parameters) {
  if (!parameters?.properties || parameters.properties[REASON_PARAM]) {
    return null
  }
  return {
    ...parameters,
    properties: { ...parameters.properties, [REASON_PARAM]: REASON_SCHEMA },
    required: [...(parameters.required ?? []), REASON_PARAM]
  }
}

/**
 * The sentence of the LLM that tells why it calls the tool, or null
 * @param {ScribeCapability} capability
 * @param {object} params - the params of the call
 * @returns {string|null}
 */
export function getCallReason(capability, params) {
  const reason = capability.hasReason ? params?.[REASON_PARAM] : null
  return typeof reason === 'string' && reason.trim() !== ''
    ? reason.trim()
    : null
}

/**
 * @typedef {object} ScribeStep
 * @property {string|null} label - what the LLM says it does, or the label
 * of the app for the tool: null without either, never the name of the tool,
 * written for the LLM
 * @property {string} tool - the name of the tool it calls
 * @property {string[]} details - the params it fills, as "name: value"
 */

const MAX_DETAIL_LENGTH = 80

function getDetailText(value) {
  if (Array.isArray(value)) {
    return value
      .filter(item => typeof item === 'string' && item !== '')
      .join(', ')
  }
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

/**
 * The params of a call as "name: value", the ones it left empty out, and the
 * reason the assistant asked the LLM for: a reason param of the tool stays
 * @param {object} params
 * @param {boolean} hasReason - whether the assistant added the reason param
 * @returns {string[]}
 */
export function getStepDetails(params, hasReason) {
  return Object.entries(params)
    .filter(([name]) => !hasReason || name !== REASON_PARAM)
    .map(([name, value]) => [name, getDetailText(value)])
    .filter(([, text]) => text !== '')
    .map(([name, text]) =>
      text.length > MAX_DETAIL_LENGTH
        ? `${name}: ${text.slice(0, MAX_DETAIL_LENGTH)}…`
        : `${name}: ${text}`
    )
}

/**
 * The step of a call the assistant hands at once, of a tool of the app
 * @param {ScribeCapability} capability
 * @param {object} params
 * @returns {ScribeStep}
 */
function makeStep(capability, params) {
  return {
    label: getCallReason(capability, params) ?? capability.stepLabel ?? null,
    tool: capability.name,
    details: getStepDetails(params, capability.hasReason === true)
  }
}

/**
 * The step of a message: a call of a tool of the app that needs no
 * confirmation, handed at once, or not at all in a past conversation
 * @param {object} message - a message of the thread
 * @param {ScribeCapability[]} capabilities
 * @returns {ScribeStep|null} null when the message is not a step
 */
export function getStep(message, capabilities) {
  const action = message?.metadata?.custom?.action
  if (!action) return null
  const capability = capabilities.find(({ name }) => name === action.name)
  if (!capability || capability.confirm) return null
  return makeStep(capability, action.params ?? {})
}

/**
 * The steps that follow one another around a message, in their order: the
 * first one shows them all, and stays as the next ones come, so that the
 * list it unfolds stays open
 * @param {object[]} messages - the messages of the thread
 * @param {string} messageId
 * @param {ScribeCapability[]} capabilities
 * @returns {{ isFirst: boolean, steps: ScribeStep[] }|null}
 */
export function findStepGroup(messages, messageId, capabilities) {
  const index = messages.findIndex(({ id }) => id === messageId)
  if (index === -1) return null
  const step = getStep(messages[index], capabilities)
  if (step === null) return null
  const steps = [step]
  let first = index
  while (first > 0) {
    const previous = getStep(messages[first - 1], capabilities)
    if (previous === null) break
    steps.unshift(previous)
    first--
  }
  for (let i = index + 1; i < messages.length; i++) {
    const next = getStep(messages[i], capabilities)
    if (next === null) break
    steps.push(next)
  }
  return { isFirst: first === index, steps }
}

function withoutReason(params) {
  const { [REASON_PARAM]: _reason, ...appParams } = params
  return appParams
}

/**
 * @param {import('@/lib/intent').Capability[]} capabilities
 * @param {Function} t - translation function
 * @param {Function} onCall - called with the result of the intent,
 * { tool, capability, params, text, format, messageId }: `capability` is the
 * former name of `tool`, kept for the apps written with it
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
    // The LLM calls a tool for its examples: the request of a chip that asks
    // for it is one, so that the chip gets the tool
    const requests = findRequestsFor(suggestions, name)
      .filter(message => !examples.includes(message))
      .filter(message => findExampleError(message) === null)
    const hasContent = action.content !== undefined
    const parameters = hasContent ? null : withReason(action.parameters)
    const hasReason = parameters !== null

    return {
      name,
      label: label ?? t('scribe.capabilities.run'),
      // The line of a step without the reason of the LLM: the words of the
      // app only, not the button label nor the name of the tool
      stepLabel: label ?? null,
      confirm,
      hasContent,
      hasReason,
      action: {
        ...action,
        ...(hasReason && { parameters }),
        ...(requests.length > 0 && {
          examples: [...examples, ...requests]
        })
      },
      onClick: (params, text = '', messageId = null) =>
        onCall({
          tool: name,
          capability: name,
          params: hasReason ? withoutReason(params) : params,
          ...(hasContent && { text, format: 'markdown' }),
          ...(messageId && { messageId })
        })
    }
  })
}
