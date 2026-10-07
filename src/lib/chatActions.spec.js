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
    ['the reserved name', { name: 'search' }],
    ['no description', { description: ' ' }],
    ['instructions that are not a text', { instructions: 12 }],
    ['an empty example', { examples: [{ message: '' }] }],
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
    ['negative max_tokens', { max_tokens: -1 }],
    ['max_tokens that is not a number', { max_tokens: '100' }]
  ])('refuses a content with %s', (_, content) => {
    expect(findChatActionError({ ...createDocument, content })).not.toBe(null)
  })

  it('leaves the size of the definitions to the client, as cozy-stack does', () => {
    expect(findChatActionError({ ...insertSlide, name: 'a'.repeat(100) })).toBe(
      null
    )
    expect(
      findChatActionError({
        ...insertSlide,
        description: 'd'.repeat(5000),
        instructions: 'i'.repeat(5000),
        examples: Array(20).fill({ message: 'm'.repeat(2000) }),
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            Array.from({ length: 30 }, (_, index) => [
              `p${index}`,
              { type: 'string', description: 'd'.repeat(2000) }
            ])
          )
        }
      })
    ).toBe(null)
    expect(
      findChatActionError({
        ...createDocument,
        content: { max_tokens: 100000 }
      })
    ).toBe(null)
  })

  it('refuses what is not an action', () => {
    expect(findChatActionError(null)).not.toBe(null)
    expect(findChatActionError('insert_slide')).not.toBe(null)
  })
})

describe('findExampleError', () => {
  it('takes an example with a message', () => {
    expect(findExampleError({ message: 'Add a slide' })).toBe(null)
    expect(findExampleError({ message: '  ' })).not.toBe(null)
  })
})
