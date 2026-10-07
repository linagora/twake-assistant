// The rules of cozy-stack on the actions of its chat (ValidateActions in
// model/rag/router.go). The stack refuses a whole message for one action
// that breaks them, with a 400: a capability that breaks one is left out
// before the message is sent.
const ACTION_NAME = /^[a-z][a-z0-9_]*$/
const PARAM_NAME = /^[a-zA-Z][a-zA-Z0-9_]*$/
// The stack routes a plain request as this action
const RESERVED_NAME = 'search'

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
  return isFilled(example?.message) ? null : 'an example has no message'
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
    typeof schema.description !== 'string'
  ) {
    return `the description of param ${name} is not a text`
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
  if (names.length === 0) return 'parameters have no property'
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
  if (!isFilled(description)) return 'no description'
  if (instructions !== undefined && typeof instructions !== 'string') {
    return 'the instructions are not a text'
  }
  if (examples !== undefined) {
    if (!Array.isArray(examples)) return 'examples is not a list'
    const error = examples.map(findExampleError).find(Boolean)
    if (error) return error
  }
  if (isObject(parameters) === isObject(content)) {
    return 'an action has either parameters or a content'
  }
  if (isObject(content)) {
    const maxTokens = content.max_tokens ?? 0
    return Number.isInteger(maxTokens) && maxTokens >= 0
      ? null
      : 'max_tokens is not a positive integer'
  }
  return findParametersError(parameters)
}
