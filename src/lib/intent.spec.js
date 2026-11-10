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
      tools: [],
      suggestions: null,
      documents: null,
      theme: { type: 'dark' },
      layout: 'panel',
      draft: null,
      conversation: null,
      source: null,
      rules: null,
      document: undefined,
      documentTruncated: false,
      documentAvailable: false,
      toolResults: false
    })
  })

  it.each([null, undefined, {}])('has defaults without data (%p)', data => {
    expect(getIntentConfig(data)).toEqual({
      content: '',
      answerActions: [],
      tools: [],
      suggestions: null,
      documents: null,
      theme: { type: null },
      layout: 'panel',
      draft: null,
      conversation: null,
      source: null,
      rules: null,
      document: undefined,
      documentTruncated: false,
      documentAvailable: false,
      toolResults: false
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
      tools: [],
      suggestions: null,
      documents: null,
      theme: { type: null },
      layout: 'panel',
      draft: null,
      conversation: null,
      source: null,
      rules: null,
      document: undefined,
      documentTruncated: false,
      documentAvailable: false,
      toolResults: false
    })
    expect(getIntentConfig({ answerActions: null }).answerActions).toEqual([])
    expect(getIntentConfig({ answerActions: 'insert' }).answerActions).toEqual(
      []
    )
  })

  describe('tools', () => {
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

    it('reads the tools, under their name or their former one', () => {
      expect(getIntentConfig({ tools: [insertSlide] }).tools).toHaveLength(1)
      expect(
        getIntentConfig({ capabilities: [insertSlide] }).tools
      ).toHaveLength(1)
      expect(
        getIntentConfig({ tools: [insertSlide], capabilities: [] }).tools
      ).toHaveLength(1, 'tools wins')
    })

    it('reads a tool as a chat action, and the label of its button', () => {
      expect(getIntentConfig({ tools: [insertSlide] }).tools).toEqual([
        {
          name: 'insert_slide',
          label: 'Insert the slide',
          confirm: true,
          action: {
            name: 'insert_slide',
            description: 'add a slide',
            examples: ['Add a slide'],
            parameters,
            instructions: 'Short titles'
          }
        }
      ])
    })

    it('leaves out what the app does not give', () => {
      expect(
        getIntentConfig({
          tools: [{ name: 'add_row', description: 'add a row', parameters }]
        }).tools
      ).toEqual([
        {
          name: 'add_row',
          label: null,
          confirm: true,
          action: { name: 'add_row', description: 'add a row', parameters }
        }
      ])
    })

    it('leaves out a tool the stack would refuse', () => {
      expect(
        getIntentConfig({
          tools: [
            { ...insertSlide, name: 'insertSlide' },
            { ...insertSlide, name: 'search' },
            { ...insertSlide, description: '' },
            { ...insertSlide, parameters: null },
            null,
            'insert_slide'
          ]
        }).tools
      ).toEqual([])
      expect(getIntentConfig({ tools: {} }).tools).toEqual([])
    })

    it('reads a tool whose content the assistant writes', () => {
      expect(
        getIntentConfig({
          tools: [
            {
              name: 'create_document',
              description: 'write a document',
              content: { max_tokens: 2048 },
              confirm: true
            }
          ]
        }).tools
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

    it('leaves out a tool with both params and content, or neither', () => {
      expect(
        getIntentConfig({
          tools: [
            { ...insertSlide, content: {} },
            { name: 'noop', description: 'nothing' }
          ]
        }).tools
      ).toEqual([])
    })

    it('hands a call without a confirmation when the app says so', () => {
      const [tool] = getIntentConfig({
        tools: [{ ...insertSlide, confirm: false }]
      }).tools

      expect(tool.confirm).toBe(false)
    })

    it('leaves out a tool with the same name as another one', () => {
      const tools = getIntentConfig({
        tools: [insertSlide, { ...insertSlide, label: 'Again' }]
      }).tools

      expect(tools.map(tool => tool.label)).toEqual(['Insert the slide'])
    })

    it('sends the examples to the stack as their messages', () => {
      const [tool] = getIntentConfig({
        tools: [
          {
            ...insertSlide,
            examples: [
              { message: 'Add a slide', needs_documents: 'yes' },
              { message: 'Add a closing slide' }
            ]
          }
        ]
      }).tools

      expect(tool.action.examples).toEqual([
        'Add a slide',
        'Add a closing slide'
      ])
    })

    it('keeps as many tools as the app gives', () => {
      const tools = Array.from({ length: 12 }, (_, index) => ({
        ...insertSlide,
        name: `action_${index}`
      }))

      expect(getIntentConfig({ tools }).tools).toHaveLength(12)
    })
  })

  describe('suggestions', () => {
    it('reads the tool of a suggestion under its former name', () => {
      const [suggestion] = getIntentConfig({
        suggestions: [
          { name: 'new_slide', capability: 'insert_slide', message: 'Add one' }
        ]
      }).suggestions

      expect(suggestion.tool).toBe('insert_slide')
    })

    it('reads the suggestions of the app, and the default menu among them', () => {
      expect(
        getIntentConfig({
          suggestions: [
            { name: 'catalogue' },
            { name: 'fix', prompt: 'correct-grammar', label: 'Fix' },
            {
              name: 'new_slide',
              tool: 'insert_slide',
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
          tool: null,
          message: null,
          instructions: null
        },
        {
          name: 'new_slide',
          label: 'New slide',
          prompt: null,
          tool: 'insert_slide',
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
              tool: null,
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

  it('reads the layout, the draft and the conversation of the data', () => {
    expect(
      getIntentConfig({
        layout: 'compact',
        draft: 'Hi',
        conversation: 'c1',
        source: 'selection'
      })
    ).toMatchObject({
      layout: 'compact',
      draft: 'Hi',
      conversation: 'c1',
      source: 'selection'
    })
    expect(getIntentConfig({ layout: 'other' }).layout).toBe('panel')
    expect(
      getIntentConfig({ draft: 12, conversation: '', source: {} })
    ).toMatchObject({ draft: null, conversation: null, source: null })
  })

  it('reads the rules of the data', () => {
    expect(getIntentConfig({ rules: 'Never write the price.' }).rules).toBe(
      'Never write the price.'
    )
    expect(getIntentConfig({ rules: '' }).rules).toBe(null)
    expect(getIntentConfig({ rules: ['Be short'] }).rules).toBe(null)
  })

  it('reads the document the app gives, or that it cannot read it', () => {
    expect(
      getIntentConfig({ document: 'Bonjour', documentTruncated: true })
    ).toMatchObject({ document: 'Bonjour', documentTruncated: true })
    expect(getIntentConfig({ document: '' }).document).toBe('')
    expect(getIntentConfig({ document: null })).toMatchObject({
      document: null,
      documentTruncated: false
    })
    expect(getIntentConfig({}).document).toBe(undefined)
    expect(getIntentConfig({ document: 12 }).document).toBe(undefined)
    expect(
      getIntentConfig({ document: 'Bonjour', documentTruncated: 'yes' })
        .documentTruncated
    ).toBe(false)
  })

  it('reads whether the app answers a request for its document', () => {
    expect(getIntentConfig({ documentAvailable: true }).documentAvailable).toBe(
      true
    )
    expect(
      getIntentConfig({ documentAvailable: false }).documentAvailable
    ).toBe(false)
    expect(
      getIntentConfig({ documentAvailable: 'true' }).documentAvailable
    ).toBe(false)
  })

  it('reads whether the app gives back the results of the calls', () => {
    expect(getIntentConfig({ toolResults: true }).toolResults).toBe(true)
    expect(getIntentConfig({ toolResults: 'true' }).toolResults).toBe(false)
    expect(getIntentConfig({}).toolResults).toBe(false)
  })

  describe('documents', () => {
    it('reads whether the answers come from the documents at first', () => {
      expect(getIntentConfig({ documents: true }).documents).toBe(true)
      expect(getIntentConfig({ documents: false }).documents).toBe(false)
      expect(getIntentConfig({ documents: 'yes' }).documents).toBe(null)
    })
  })
})
