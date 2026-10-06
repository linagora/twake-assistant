const THEME_TYPES = ['light', 'dark']
// The stack takes at most 10 actions, 5 examples each, named as it allows
const MAX_CAPABILITIES = 10
const MAX_EXAMPLES = 5
const MAX_TEXT_CHARS = 1000
const MAX_EXAMPLE_CHARS = 300
const CAPABILITY_NAME = /^[a-z][a-z0-9_]{0,39}$/
// The reserved name of a suggestion: the default menu of the scribe
export const CATALOGUE_SUGGESTION = 'catalogue'

function isAnswerAction(action) {
  return typeof action?.name === 'string' && action.name !== ''
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value) {
  return typeof value === 'string' && value !== ''
}

function readText(value) {
  return isText(value) ? value : null
}

function isExample(example) {
  return isText(example?.message)
}

// A capability the stack would refuse is left out: it would refuse the whole
// message with it
function isCapability(capability) {
  const hasOneForm =
    isObject(capability?.parameters) !== isObject(capability?.content)

  return (
    typeof capability?.name === 'string' &&
    CAPABILITY_NAME.test(capability.name) &&
    capability.name !== 'search' &&
    isText(capability.description) &&
    hasOneForm
  )
}

/**
 * The definition of a capability as the stack takes it, a chat action, with
 * the label of the button that hands it to the app, and whether the user
 * confirms it first
 */
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
      description: description.slice(0, MAX_TEXT_CHARS),
      ...(Array.isArray(examples) && {
        examples: examples
          .filter(isExample)
          .slice(0, MAX_EXAMPLES)
          .map(({ message, needs_documents: needsDocuments }) => ({
            message: message.slice(0, MAX_EXAMPLE_CHARS),
            needs_documents: needsDocuments === true
          }))
      }),
      ...(isObject(parameters) ? { parameters } : { content }),
      ...(isText(instructions) && {
        instructions: instructions.slice(0, MAX_TEXT_CHARS)
      })
    }
  }
}

// A suggestion sends a prompt of the catalogue, a request for a capability,
// a request of its own, or opens a menu of them. The default menu is one
// entry.
function isSuggestion(suggestion) {
  if (!isText(suggestion?.name)) return false
  if (suggestion.name === CATALOGUE_SUGGESTION) return true
  if (Array.isArray(suggestion.options)) {
    return suggestion.options.some(isSuggestion)
  }
  return isText(suggestion.prompt) || isText(suggestion.message)
}

function readSuggestion(suggestion) {
  const { name, label, prompt, capability, message, instructions, options } =
    suggestion
  if (name === CATALOGUE_SUGGESTION) return { name }
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
 * @property {string} name - e.g. insert_slide
 * @property {string|null} label - the text of the button that hands it to
 * the app
 * @property {boolean} confirm - whether the user confirms a call before it
 * is handed to the app
 * @property {object} action - its definition as a chat action of the stack:
 * name, description, examples, parameters (a JSON schema) or content, and
 * instructions. The LLM decides whether a message needs it, and fills its
 * params or writes its content.
 */

/**
 * @typedef {object} SuggestionConfig
 * @property {string} name - `catalogue` for the default menu of the scribe
 * @property {string|null} [label]
 * @property {string|null} [prompt] - a prompt of the catalogue
 * @property {string|null} [capability] - the capability the request is for
 * @property {string|null} [message] - the request sent
 * @property {string|null} [instructions] - how to answer the request
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
 * }}
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
      ? capabilities
          .filter(isCapability)
          .slice(0, MAX_CAPABILITIES)
          .map(readCapability)
      : [],
    // null leaves the scribe its default menu
    suggestions: Array.isArray(suggestions)
      ? suggestions.filter(isSuggestion).map(readSuggestion)
      : null,
    documents: typeof documents === 'boolean' ? documents : null,
    theme: { type: THEME_TYPES.includes(theme?.type) ? theme.type : null }
  }
}
