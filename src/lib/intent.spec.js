import { getIntentConfig } from '@/lib/intent'

describe('getIntentConfig', () => {
  it('reads the text, the actions and the theme of the app', () => {
    expect(
      getIntentConfig({
        content: 'Bonjour',
        answerActions: [{ name: 'insert', label: 'Insérer' }, { name: 'copy' }],
        theme: { type: 'dark' }
      })
    ).toEqual({
      content: 'Bonjour',
      answerActions: [
        { name: 'insert', label: 'Insérer' },
        { name: 'copy', label: null }
      ],
      capabilities: [],
      suggestions: null,
      documents: null,
      theme: { type: 'dark' }
    })
  })

  it.each([null, undefined, {}])('has defaults without data (%p)', data => {
    expect(getIntentConfig(data)).toEqual({
      content: '',
      answerActions: [],
      capabilities: [],
      suggestions: null,
      documents: null,
      theme: { type: null }
    })
  })

  it('leaves out what it cannot read', () => {
    expect(
      getIntentConfig({
        content: 12,
        answerActions: ['insert', null, { label: 'No name' }, { name: '' }],
        theme: { type: 'blue' }
      })
    ).toEqual({
      content: '',
      answerActions: [],
      capabilities: [],
      suggestions: null,
      documents: null,
      theme: { type: null }
    })
    expect(getIntentConfig({ answerActions: null }).answerActions).toEqual([])
    expect(getIntentConfig({ answerActions: 'insert' }).answerActions).toEqual(
      []
    )
  })

  describe('capabilities', () => {
    const parameters = {
      type: 'object',
      properties: { title: { type: 'string' } },
      required: ['title']
    }
    const insertSlide = {
      name: 'insert_slide',
      label: 'Insert the slide',
      description: 'add a slide',
      examples: [{ message: 'Add a slide', needs_documents: false }],
      parameters,
      instructions: 'Short titles'
    }

    it('reads a capability as a chat action, and the label of its button', () => {
      expect(
        getIntentConfig({ capabilities: [insertSlide] }).capabilities
      ).toEqual([
        {
          name: 'insert_slide',
          label: 'Insert the slide',
          confirm: true,
          action: {
            name: 'insert_slide',
            description: 'add a slide',
            examples: [{ message: 'Add a slide', needs_documents: false }],
            parameters,
            instructions: 'Short titles'
          }
        }
      ])
    })

    it('leaves out what the app does not give', () => {
      expect(
        getIntentConfig({
          capabilities: [
            { name: 'add_row', description: 'add a row', parameters }
          ]
        }).capabilities
      ).toEqual([
        {
          name: 'add_row',
          label: null,
          confirm: true,
          action: { name: 'add_row', description: 'add a row', parameters }
        }
      ])
    })

    it('leaves out a capability the stack would refuse', () => {
      expect(
        getIntentConfig({
          capabilities: [
            { ...insertSlide, name: 'insertSlide' },
            { ...insertSlide, name: 'search' },
            { ...insertSlide, description: '' },
            { ...insertSlide, parameters: null },
            null,
            'insert_slide'
          ]
        }).capabilities
      ).toEqual([])
      expect(getIntentConfig({ capabilities: {} }).capabilities).toEqual([])
    })

    it('reads a capability whose content the assistant writes', () => {
      expect(
        getIntentConfig({
          capabilities: [
            {
              name: 'create_document',
              description: 'write a document',
              content: { max_tokens: 2048 },
              confirm: true
            }
          ]
        }).capabilities
      ).toEqual([
        {
          name: 'create_document',
          label: null,
          confirm: true,
          action: {
            name: 'create_document',
            description: 'write a document',
            content: { max_tokens: 2048 }
          }
        }
      ])
    })

    it('leaves out a capability with both params and content, or neither', () => {
      expect(
        getIntentConfig({
          capabilities: [
            { ...insertSlide, content: {} },
            { name: 'noop', description: 'nothing' }
          ]
        }).capabilities
      ).toEqual([])
    })

    it('hands a call without a confirmation when the app says so', () => {
      const [capability] = getIntentConfig({
        capabilities: [{ ...insertSlide, confirm: false }]
      }).capabilities

      expect(capability.confirm).toBe(false)
    })

    it('keeps what the stack takes of the examples and the texts', () => {
      const [capability] = getIntentConfig({
        capabilities: [
          {
            ...insertSlide,
            description: 'd'.repeat(1200),
            instructions: 'i'.repeat(1200),
            examples: [
              { message: 'm'.repeat(400), needs_documents: 'yes' },
              { message: '' },
              'Add a slide',
              ...Array.from({ length: 6 }, (_, index) => ({
                message: `Example ${index}`,
                needs_documents: true
              }))
            ]
          }
        ]
      }).capabilities

      expect(capability.action.description).toHaveLength(1000)
      expect(capability.action.instructions).toHaveLength(1000)
      expect(capability.action.examples).toHaveLength(5)
      expect(capability.action.examples[0]).toEqual({
        message: 'm'.repeat(300),
        needs_documents: false
      })
      expect(capability.action.examples[1]).toEqual({
        message: 'Example 0',
        needs_documents: true
      })
    })

    it('keeps the 10 first ones, as many as the stack takes', () => {
      const capabilities = Array.from({ length: 12 }, (_, index) => ({
        ...insertSlide,
        name: `action_${index}`
      }))

      expect(getIntentConfig({ capabilities }).capabilities).toHaveLength(10)
    })
  })

  describe('suggestions', () => {
    it('reads the suggestions of the app, and the default menu among them', () => {
      expect(
        getIntentConfig({
          suggestions: [
            { name: 'catalogue' },
            { name: 'fix', prompt: 'correct-grammar', label: 'Fix' },
            {
              name: 'new_slide',
              capability: 'insert_slide',
              label: 'New slide',
              message: 'Add a slide'
            },
            {
              name: 'more',
              label: 'More',
              options: [
                {
                  name: 'joke',
                  message: 'Tell a joke about the text',
                  instructions: 'Be funny'
                }
              ]
            }
          ]
        }).suggestions
      ).toEqual([
        { name: 'catalogue' },
        {
          name: 'fix',
          label: 'Fix',
          prompt: 'correct-grammar',
          capability: null,
          message: null,
          instructions: null
        },
        {
          name: 'new_slide',
          label: 'New slide',
          prompt: null,
          capability: 'insert_slide',
          message: 'Add a slide',
          instructions: null
        },
        {
          name: 'more',
          label: 'More',
          options: [
            {
              name: 'joke',
              label: null,
              prompt: null,
              capability: null,
              message: 'Tell a joke about the text',
              instructions: 'Be funny'
            }
          ]
        }
      ])
    })

    it('leaves out a suggestion that sends nothing, and an empty menu', () => {
      expect(
        getIntentConfig({
          suggestions: [
            { name: 'nothing' },
            { name: 'empty', options: [{ name: 'void' }] },
            { prompt: 'summarize' },
            null
          ]
        }).suggestions
      ).toEqual([])
      expect(getIntentConfig({ suggestions: 'catalogue' }).suggestions).toBe(
        null
      )
    })
  })

  describe('documents', () => {
    it('reads whether the answers come from the documents at first', () => {
      expect(getIntentConfig({ documents: true }).documents).toBe(true)
      expect(getIntentConfig({ documents: false }).documents).toBe(false)
      expect(getIntentConfig({ documents: 'yes' }).documents).toBe(null)
    })
  })
})
