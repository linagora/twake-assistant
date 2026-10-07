import Minilog from 'cozy-minilog'

import { findChatActionError } from '@/lib/chatActions'

const log = Minilog('🤖 [AssistantIntent]')

const THEME_TYPES = ['light', 'dark']
// In the suggestions of the app, this entry is not a chip: the assistant puts
// its own menu of prompts (correct, improve, tone, translate, summarize) in
// its place, so that the app sets its chips before or after it
export const DEFAULT_MENU_SUGGESTION = 'catalogue'

function isText(value) {
  return typeof value === 'string' && value !== ''
}

function readText(value) {
  return isText(value) ? value : null
}

function isAnswerAction(action) {
  return isText(action?.name)
}

function readExample({ message, needs_documents: needsDocuments }) {
  return { message, needs_documents: needsDocuments === true }
}

function readCapability({
  name,
  label,
  description,
  examples,
  parameters,
  content,
  instructions,
  confirm
}) {
  return {
    name,
    label: readText(label),
    confirm: confirm !== false,
    action: {
      name,
      description,
      ...(examples !== undefined && { examples: examples.map(readExample) }),
      ...(parameters !== undefined ? { parameters } : { content }),
      ...(isText(instructions) && { instructions })
    }
  }
}

function findCapabilityError(capability, names) {
  const error = findChatActionError(capability)
  if (error) return error
  return names.has(capability.name) ? 'another capability has its name' : null
}

// The stack refuses a whole message for one action it cannot take: such a
// capability is left out, and the app can see why in the console
function readCapabilities(capabilities) {
  const names = new Set()
  return capabilities
    .filter(capability => {
      const error = findCapabilityError(capability, names)
      if (error) {
        log.warn(`Capability ${capability?.name} left out: ${error}`)
        return false
      }
      names.add(capability.name)
      return true
    })
    .map(readCapability)
}

function isSuggestion(suggestion) {
  if (!isText(suggestion?.name)) return false
  if (suggestion.name === DEFAULT_MENU_SUGGESTION) return true
  if (Array.isArray(suggestion.options)) {
    return suggestion.options.some(isSuggestion)
  }
  return isText(suggestion.prompt) || isText(suggestion.message)
}

function readSuggestion(suggestion) {
  const { name, label, prompt, capability, message, instructions, options } =
    suggestion
  if (name === DEFAULT_MENU_SUGGESTION) return { name }
  if (Array.isArray(options)) {
    return {
      name,
      label: readText(label),
      options: options.filter(isSuggestion).map(readSuggestion)
    }
  }
  return {
    name,
    label: readText(label),
    prompt: readText(prompt),
    capability: readText(capability),
    message: readText(message),
    instructions: readText(instructions)
  }
}

/**
 * @typedef {object} Capability
 * @property {string} name
 * @property {string|null} label - the button of the card of a call
 * @property {boolean} confirm - whether the user confirms a call first
 * @property {object} action - its definition as a chat action of cozy-stack
 */

/**
 * @typedef {object} SuggestionConfig
 * @property {string} name
 * @property {string|null} [label]
 * @property {string|null} [prompt] - a prompt of the catalogue
 * @property {string|null} [capability] - the capability the message asks for
 * @property {string|null} [message]
 * @property {string|null} [instructions]
 * @property {SuggestionConfig[]} [options] - the items of a menu
 */

/**
 * Reads the data of the intent, whatever the app sent: a field that is
 * missing, null or of another type is as if it was not given
 *
 * @param {object|null|undefined} data - the data of the intent
 * @returns {{
 *   content: string,
 *   answerActions: { name: string, label: string|null }[],
 *   capabilities: Capability[],
 *   suggestions: SuggestionConfig[]|null,
 *   documents: boolean|null,
 *   theme: { type: 'light'|'dark'|null }
 * }} `suggestions` is null when the app leaves the scribe its default menu
 */
export function getIntentConfig(data) {
  const {
    content,
    answerActions,
    capabilities,
    suggestions,
    documents,
    theme
  } = data ?? {}

  return {
    content: typeof content === 'string' ? content : '',
    answerActions: Array.isArray(answerActions)
      ? answerActions.filter(isAnswerAction).map(({ name, label }) => ({
          name,
          label: readText(label)
        }))
      : [],
    capabilities: Array.isArray(capabilities)
      ? readCapabilities(capabilities)
      : [],
    suggestions: Array.isArray(suggestions)
      ? suggestions.filter(isSuggestion).map(readSuggestion)
      : null,
    documents: typeof documents === 'boolean' ? documents : null,
    theme: { type: THEME_TYPES.includes(theme?.type) ? theme.type : null }
  }
}
