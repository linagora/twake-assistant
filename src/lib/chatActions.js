// The limits of cozy-stack on the actions of its chat (ValidateActions in
// model/rag/router.go): they go into the prompts of a small LLM. The stack
// refuses a message whose actions break one with a 400, so a capability
// that breaks one is left out before the message is sent.
export const MAX_ACTIONS = 10
export const MAX_EXAMPLES = 5
const MAX_PARAMS = 10
const MAX_DESCRIPTION_CHARS = 1000
const MAX_SHORT_TEXT_CHARS = 300
const MAX_CONTENT_TOKENS = 4096
const ACTION_NAME = /^[a-z][a-z0-9_]{0,39}$/
const PARAM_NAME = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/
// The stack routes a plain request as this action
const RESERVED_NAME = 'search'

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// The stack counts characters, not UTF-16 units
function countChars(text) {
  return [...text].length
}

function isFilled(text) {
  return typeof text === 'string' && text.trim() !== ''
}

/**
 * Why the stack would refuse an example of an action
 *
 * @param {{ message: string }} example
 * @returns {string|null} the reason, null for an example it takes
 */
export function findExampleError(example) {
  if (!isFilled(example?.message)) return 'an example has no message'
  if (countChars(example.message) > MAX_SHORT_TEXT_CHARS) {
    return `an example has more than ${MAX_SHORT_TEXT_CHARS} characters`
  }
  return null
}

function findParamError(name, schema) {
  if (!PARAM_NAME.test(name)) return `invalid param name ${name}`
  const isString = schema?.type === 'string' && schema.items === undefined
  const isList = schema?.type === 'array' && schema.items?.type === 'string'
  if (!isString && !isList) {
    return `param ${name} is neither a string nor a list of strings`
  }
  if (
    schema.description !== undefined &&
    (typeof schema.description !== 'string' ||
      countChars(schema.description) > MAX_SHORT_TEXT_CHARS)
  ) {
    return `the description of param ${name} must have at most ${MAX_SHORT_TEXT_CHARS} characters`
  }
  const userWritten = schema['x-user-written']
  if (userWritten !== undefined && typeof userWritten !== 'boolean') {
    return `x-user-written of param ${name} is not a boolean`
  }
  return null
}

function findParametersError(parameters) {
  if (parameters.type !== 'object' || !isObject(parameters.properties)) {
    return 'parameters is not an object schema'
  }
  const names = Object.keys(parameters.properties)
  if (names.length === 0 || names.length > MAX_PARAMS) {
    return `parameters must have 1 to ${MAX_PARAMS} properties`
  }
  for (const name of names) {
    const error = findParamError(name, parameters.properties[name])
    if (error) return error
  }
  const required = parameters.required ?? []
  if (!Array.isArray(required)) return 'required is not a list'
  const missing = required.find(name => !names.includes(name))
  if (missing !== undefined)
    return `required param ${missing} is not a property`
  return null
}

/**
 * Why the stack would refuse the definition of an action
 *
 * @param {object} definition - name, description, examples, parameters or
 * content, instructions
 * @returns {string|null} the reason, null for a definition it takes
 */
export function findChatActionError(definition) {
  const { name, description, instructions, examples, parameters, content } =
    definition ?? {}

  if (typeof name !== 'string' || !ACTION_NAME.test(name)) {
    return `invalid name ${name}`
  }
  if (name === RESERVED_NAME) return `the name ${name} is reserved`
  if (
    !isFilled(description) ||
    countChars(description) > MAX_DESCRIPTION_CHARS
  ) {
    return `the description must have 1 to ${MAX_DESCRIPTION_CHARS} characters`
  }
  if (
    instructions !== undefined &&
    (typeof instructions !== 'string' ||
      countChars(instructions) > MAX_DESCRIPTION_CHARS)
  ) {
    return `the instructions must have at most ${MAX_DESCRIPTION_CHARS} characters`
  }
  if (examples !== undefined) {
    if (!Array.isArray(examples) || examples.length > MAX_EXAMPLES) {
      return `at most ${MAX_EXAMPLES} examples`
    }
    const error = examples.map(findExampleError).find(Boolean)
    if (error) return error
  }
  if (isObject(parameters) === isObject(content)) {
    return 'an action has either parameters or a content'
  }
  if (isObject(content)) {
    const maxTokens = content.max_tokens ?? 0
    if (
      !Number.isInteger(maxTokens) ||
      maxTokens < 0 ||
      maxTokens > MAX_CONTENT_TOKENS
    ) {
      return `max_tokens must be at most ${MAX_CONTENT_TOKENS}`
    }
    return null
  }
  return findParametersError(parameters)
}
