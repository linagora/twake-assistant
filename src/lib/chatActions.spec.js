import { findChatActionError, findExampleError } from '@/lib/chatActions'

const parameters = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'the title' },
    bullets: { type: 'array', items: { type: 'string' } }
  },
  required: ['title']
}
const insertSlide = {
  name: 'insert_slide',
  description: 'add a slide',
  examples: [{ message: 'Add a slide', needs_documents: false }],
  parameters,
  instructions: 'Short titles'
}
const createDocument = {
  name: 'create_document',
  description: 'write a document',
  content: { max_tokens: 2048 }
}

describe('findChatActionError', () => {
  it('takes an action with parameters, and one with a content', () => {
    expect(findChatActionError(insertSlide)).toBe(null)
    expect(findChatActionError(createDocument)).toBe(null)
    expect(findChatActionError({ ...createDocument, content: {} })).toBe(null)
  })

  it.each([
    ['a name the stack does not allow', { name: 'insertSlide' }],
    ['a name too long', { name: 'a'.repeat(41) }],
    ['the reserved name', { name: 'search' }],
    ['no description', { description: ' ' }],
    ['a description too long', { description: 'é'.repeat(1001) }],
    ['instructions too long', { instructions: 'i'.repeat(1001) }],
    ['instructions that are not a text', { instructions: 12 }],
    [
      'too many examples',
      { examples: Array(6).fill({ message: 'Add a slide' }) }
    ],
    ['an empty example', { examples: [{ message: '' }] }],
    ['an example too long', { examples: [{ message: 'm'.repeat(301) }] }],
    ['both parameters and a content', { content: {} }],
    ['neither parameters nor a content', { parameters: undefined }],
    [
      'parameters that are not an object schema',
      { parameters: { type: 'array' } }
    ],
    [
      'parameters without properties',
      { parameters: { type: 'object', properties: {} } }
    ],
    [
      'too many parameters',
      {
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            Array.from({ length: 11 }, (_, index) => [
              `p${index}`,
              { type: 'string' }
            ])
          )
        }
      }
    ],
    [
      'a param name the stack does not allow',
      {
        parameters: {
          type: 'object',
          properties: { '1st': { type: 'string' } }
        }
      }
    ],
    [
      'a param that is a number',
      {
        parameters: {
          type: 'object',
          properties: { count: { type: 'number' } }
        }
      }
    ],
    [
      'a list of numbers',
      {
        parameters: {
          type: 'object',
          properties: { counts: { type: 'array', items: { type: 'number' } } }
        }
      }
    ],
    [
      'the description of a param too long',
      {
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'd'.repeat(301) }
          }
        }
      }
    ],
    [
      'x-user-written that is not a boolean',
      {
        parameters: {
          type: 'object',
          properties: { to: { type: 'string', 'x-user-written': 'yes' } }
        }
      }
    ],
    [
      'a required param that is not a property',
      { parameters: { ...parameters, required: ['subtitle'] } }
    ]
  ])('refuses %s, as cozy-stack does', (_, change) => {
    expect(findChatActionError({ ...insertSlide, ...change })).not.toBe(null)
  })

  it.each([
    ['max_tokens too high', { max_tokens: 4097 }],
    ['max_tokens that is not a number', { max_tokens: '100' }]
  ])('refuses a content with %s', (_, content) => {
    expect(findChatActionError({ ...createDocument, content })).not.toBe(null)
  })

  it('refuses what is not an action', () => {
    expect(findChatActionError(null)).not.toBe(null)
    expect(findChatActionError('insert_slide')).not.toBe(null)
  })
})

describe('findExampleError', () => {
  it('takes an example of 1 to 300 characters', () => {
    expect(findExampleError({ message: 'Add a slide' })).toBe(null)
    expect(findExampleError({ message: 'é'.repeat(300) })).toBe(null)
    expect(findExampleError({ message: 'é'.repeat(301) })).not.toBe(null)
    expect(findExampleError({ message: '  ' })).not.toBe(null)
  })
})
