import { Text } from '@linagora/twake-icons'
import { initTranslation } from 'twake-i18n'

import {
  getRunningLabel,
  getScribeConversationDescription,
  getScribeRequest,
  getScribeWording,
  makeScribeAnswerActions,
  makeScribeCapabilities,
  makeChatMessages,
  makeScribePreparePrompt,
  makeScribePrepareQuery,
  makeScribeSuggestions
} from '@/lib/scribe'
import catalogue from '@/lib/scribePrompts.json'
import en from '@/locales/en.json'

const polyglot = initTranslation('en', () => en)
const mockT = polyglot.t.bind(polyglot)

describe('makeScribeSuggestions', () => {
  it('arranges the prompts of the catalogue as the design of the side panel', () => {
    const suggestions = makeScribeSuggestions(mockT)

    expect(suggestions.map(suggestion => suggestion.name)).toEqual([
      'summarize',
      'correct',
      'keypoints',
      'rewrite',
      'tone',
      'translate'
    ])
    expect(suggestions[0]).toEqual({
      name: 'summarize',
      label: 'Summary',
      icon: Text,
      request: 'Summarize the text.',
      running: 'Summarizing…',
      prompt: 'summarize'
    })
    expect(suggestions[3].options.map(option => option.prompt)).toEqual([
      'make-shorter',
      'expand-context'
    ])
    expect(suggestions[4].label).toBe('Tone')
    expect(suggestions[4].options.map(option => option.prompt)).toEqual([
      'change-tone-professional',
      'change-tone-casual',
      'change-tone-polite'
    ])
    expect(suggestions[5].label).toBe('Translate')
  })

  it('leaves out the prompts the catalogue does not have yet, and a menu left empty', () => {
    let suggestions
    jest.isolateModules(() => {
      jest.doMock('@/lib/scribePrompts.json', () => ({
        prompts: ['summarize', 'translate-german'].map(name => ({
          name,
          messages: [{ role: 'user', content: `${name}: {{input}}` }]
        }))
      }))
      suggestions = require('@/lib/scribe').makeScribeSuggestions(mockT)
    })

    expect(suggestions.map(suggestion => suggestion.name)).toEqual([
      'summarize',
      'translate'
    ])
    expect(suggestions[1].options.map(option => option.prompt)).toEqual([
      'translate-german'
    ])
  })

  it('only offers prompts the catalogue has', () => {
    const names = catalogue.prompts.map(prompt => prompt.name)
    const prompts = makeScribeSuggestions(mockT).flatMap(
      suggestion => suggestion.options ?? [suggestion]
    )

    prompts.forEach(suggestion => {
      expect(names).toContain(suggestion.prompt)
      expect(suggestion.request).not.toMatch(/^scribe\./)
      expect(suggestion.running).not.toMatch(/^scribe\./)
    })
  })
})

describe('makeScribeSuggestions with the suggestions of the app', () => {
  const capabilities = [{ name: 'insert_slide', label: 'Insert the slide' }]

  it('puts the default menu where the app asks for it', () => {
    const suggestions = makeScribeSuggestions(
      mockT,
      [
        {
          name: 'new_slide',
          capability: 'insert_slide',
          label: 'New slide',
          message: 'Add a slide after this one'
        },
        { name: 'catalogue' }
      ],
      capabilities
    )

    expect(suggestions[0]).toEqual({
      name: 'new_slide',
      label: 'New slide',
      request: 'Add a slide after this one'
    })
    expect(suggestions.slice(1)).toEqual(makeScribeSuggestions(mockT))
  })

  it('names a prompt of the catalogue as the default menu does, unless the app does', () => {
    const [correct, summary] = makeScribeSuggestions(mockT, [
      { name: 'correct', prompt: 'correct-grammar' },
      {
        name: 'summary',
        prompt: 'summarize',
        label: 'Sum up',
        message: 'Sum the text up.'
      }
    ])

    expect(correct).toEqual({
      name: 'correct',
      label: 'Correct',
      request: 'Correct the grammar and spelling of the text.',
      prompt: 'correct-grammar'
    })
    expect(summary).toEqual({
      name: 'summary',
      label: 'Sum up',
      request: 'Sum the text up.',
      prompt: 'summarize'
    })
  })

  it('names a request for a capability after the capability', () => {
    const [newSlide] = makeScribeSuggestions(
      mockT,
      [{ name: 'new_slide', capability: 'insert_slide', message: 'Add one' }],
      capabilities
    )

    expect(newSlide).toEqual({
      name: 'new_slide',
      label: 'Insert the slide',
      request: 'Add one'
    })
  })

  it('keeps the instructions of a request of the app, in a menu too', () => {
    const [more] = makeScribeSuggestions(mockT, [
      {
        name: 'more',
        label: 'More',
        options: [
          {
            name: 'joke',
            label: 'A joke',
            message: 'Tell a joke about the text',
            instructions: 'Be funny'
          }
        ]
      }
    ])

    expect(more).toEqual({
      name: 'more',
      label: 'More',
      options: [
        {
          name: 'joke',
          label: 'A joke',
          request: 'Tell a joke about the text',
          instructions: 'Be funny'
        }
      ]
    })
  })

  it('offers nothing when the app asks for nothing', () => {
    expect(makeScribeSuggestions(mockT, [])).toEqual([])
  })
})

describe('getRunningLabel', () => {
  it('gives the running label of a prompt', () => {
    expect(getRunningLabel('translate-french', mockT)).toBe(
      'Translating to French…'
    )
    expect(getRunningLabel('correct-grammar', mockT)).toBe(
      'Correcting grammar…'
    )
  })

  it('gives a generic label without a prompt', () => {
    expect(getRunningLabel(null, mockT)).toBe('Processing…')
    expect(getRunningLabel('unknown-prompt', mockT)).toBe('Processing…')
  })
})

describe('makeScribePreparePrompt', () => {
  const preparePrompt = makeScribePreparePrompt('Bonjour à tous, $1 et $&')

  it('gives the text in the user message of the prompt, and its system message', () => {
    const { q, instructions } = preparePrompt('correct-grammar')
    const { messages } = catalogue.prompts.find(
      ({ name }) => name === 'correct-grammar'
    )
    const { content } = messages.find(({ role }) => role === 'user')

    expect(q).toBe(content.split('{{input}}').join('Bonjour à tous, $1 et $&'))
    expect(q).toContain('Correct the grammar and spelling of the text.')
    expect(instructions).toMatch(
      /^You are a text editing assistant, NOT a chatbot\./
    )
  })

  it('gives nothing for a prompt the catalogue does not have', () => {
    expect(preparePrompt('unknown')).toBe(null)
  })
})

describe('makeScribePrepareQuery', () => {
  const prepareQuery = makeScribePrepareQuery('Bonjour à tous', mockT)

  it('joins the text of the app to the first message', () => {
    expect(prepareQuery('Translate', { isFirstOnText: true })).toBe(
      'Translate\n\nText:\n"""\nBonjour à tous\n"""'
    )
  })

  it('sends a later message as it is', () => {
    expect(prepareQuery('Shorter', { isFirstOnText: false })).toBe('Shorter')
  })

  it('puts the document before the request', () => {
    expect(
      prepareQuery('Translate', {
        isFirstOnText: true,
        document: 'Hello\n\nAll'
      })
    ).toBe(
      '[Full document]\nHello\n\nAll\n[End of full document]\n\nTranslate\n\nText:\n"""\nBonjour à tous\n"""'
    )
    expect(
      prepareQuery('Shorter', { isFirstOnText: false, document: 'Hello' })
    ).toBe('[Full document]\nHello\n[End of full document]\n\nShorter')
  })

  it('joins no text when the app gives none', () => {
    expect(
      makeScribePrepareQuery('', mockT)('Translate', { isFirstOnText: true })
    ).toBe('Translate')
  })
})

describe('getScribeRequest', () => {
  it('shows the request of a chip for its prompt', () => {
    const { q } = makeScribePreparePrompt('Bonjour')('correct-grammar')

    expect(getScribeRequest(q, mockT)).toBe(
      'Correct the grammar and spelling of the text.'
    )
  })

  it('shows the request without the text of the app', () => {
    const query = makeScribePrepareQuery('Bonjour\n\nà tous', mockT)(
      'Translate',
      { isFirstOnText: true }
    )

    expect(getScribeRequest(query, mockT)).toBe('Translate')
  })

  it('shows the request without the document of the app', () => {
    const prepareQuery = makeScribePrepareQuery('Bonjour', mockT)

    expect(
      getScribeRequest(
        prepareQuery('Translate', {
          isFirstOnText: true,
          document: 'Hello\n\nText:\n"""\nAll\n"""'
        }),
        mockT
      )
    ).toBe('Translate')
    expect(
      getScribeRequest(
        prepareQuery('Shorter', { isFirstOnText: false, document: 'Hello' }),
        mockT
      )
    ).toBe('Shorter')
  })

  it('shows a later request as it is', () => {
    expect(getScribeRequest('Shorter', mockT)).toBe('Shorter')
  })

  it('shows the instruction of a prompt the catalogue no longer has', () => {
    const query = 'INSTRUCTION:\nSum it up.\n\nTEXT:\nBonjour\n'

    expect(getScribeRequest(query, mockT)).toBe('Sum it up.')
  })
})

describe('makeChatMessages', () => {
  it('shows the requests and the answers of a past conversation', () => {
    const messages = makeChatMessages(
      [
        { id: 'm1', role: 'user', content: 'Hello\n\nText:\n"""\nHi\n"""' },
        {
          id: 'm2',
          role: 'assistant',
          content: 'Bonjour [doc_1]',
          sources: [{ id: 'f1' }]
        },
        { id: 'm3', role: 'user', content: 'A folder' },
        {
          id: 'm4',
          role: 'assistant',
          content: '',
          action: { name: 'create_folder', params: { name: 'X' } }
        }
      ],
      mockT
    )

    expect(messages).toEqual([
      {
        id: 'm1',
        role: 'user',
        content: 'Hello',
        metadata: { custom: { selection: 'Hi' } }
      },
      {
        id: 'm2',
        role: 'assistant',
        content: 'Bonjour',
        metadata: { custom: { isPast: true, sources: [{ id: 'f1' }] } }
      },
      { id: 'm3', role: 'user', content: 'A folder' },
      {
        id: 'm4',
        role: 'assistant',
        content: '',
        metadata: {
          custom: {
            isPast: true,
            action: { name: 'create_folder', params: { name: 'X' } }
          }
        }
      }
    ])
  })

  it('keeps the text of the app of a past request as its selection', () => {
    const [withText, withDocument, onlyDocument, withoutText] =
      makeChatMessages(
        [
          {
            id: 'm1',
            role: 'user',
            content: 'Fix it\n\nText:\n"""\nA\n\nB\n"""'
          },
          {
            id: 'm2',
            role: 'user',
            content:
              '[Full document]\nThe note\n[End of full document]\n\nFix it\n\nTexte :\n"""\nBonjour\n"""'
          },
          {
            id: 'm3',
            role: 'user',
            content:
              '[Full document]\nA\n\nText:\n"""\nB\n"""\n[End of full document]\n\nFix it'
          },
          { id: 'm4', role: 'user', content: 'Fix it' }
        ],
        mockT
      )

    expect(withText.metadata.custom.selection).toBe('A\n\nB')
    expect(withDocument.metadata.custom.selection).toBe('Bonjour')
    expect(withDocument.content).toBe('Fix it')
    expect(onlyDocument.metadata).toBeUndefined()
    expect(withoutText.metadata).toBeUndefined()
  })

  it('keeps the text of a past chip request as its selection', () => {
    const [summary, shorter] = makeChatMessages(
      [
        {
          id: 'm1',
          role: 'user',
          content: makeScribePreparePrompt('Bonjour\n\nle monde')('summarize').q
        },
        {
          id: 'm2',
          role: 'user',
          content: makeScribePreparePrompt('Hello')('make-shorter').q
        }
      ],
      mockT
    )

    expect(summary.content).toBe('Summarize the text.')
    expect(summary.metadata.custom.selection).toBe('Bonjour\n\nle monde')
    expect(shorter.metadata.custom.selection).toBe('Hello')
  })

  it('keeps no selection from a blank text', () => {
    const messages = makeChatMessages(
      [
        { id: 'm1', role: 'user', content: 'Fix it\n\nText:\n"""\n \n"""' },
        {
          id: 'm2',
          role: 'user',
          content: makeScribePreparePrompt('  ')('summarize').q
        }
      ],
      mockT
    )

    expect(messages.map(message => message.metadata)).toEqual([
      undefined,
      undefined
    ])
  })

  it('says an empty answer is empty', () => {
    const [answer] = makeChatMessages(
      [{ id: 'm2', role: 'assistant', content: ' ' }],
      mockT
    )

    expect(answer.metadata.custom.isEmpty).toBe(true)
  })

  it('keeps what the model thought before an answer', () => {
    const [answer] = makeChatMessages(
      [
        {
          id: 'm2',
          role: 'assistant',
          content: '391',
          reasoning: '17 x 23 = 391'
        }
      ],
      mockT
    )

    expect(answer.content).toEqual([
      { type: 'reasoning', text: '17 x 23 = 391' },
      { type: 'text', text: '391' }
    ])
  })
})

describe('getScribeConversationDescription', () => {
  it('describes a conversation by its last answer, not by a query going on', () => {
    const conversation = {
      messages: [
        { role: 'user', content: 'Hello\n\nText:\n"""\nHi\n"""' },
        { role: 'assistant', content: 'Bonjour [doc_1]' },
        { role: 'user', content: 'Shorter\n\nText:\n"""\nHi\n"""' }
      ]
    }

    expect(getScribeConversationDescription(conversation)).toBe('Bonjour')
    expect(getScribeConversationDescription({ messages: [] })).toBe('')
  })

  it('describes a conversation by the words of its answer, without Markdown', () => {
    const conversation = {
      messages: [
        { role: 'user', content: 'Sum it up' },
        { role: 'assistant', content: '## Summary\n\n- **Bonjour** [doc_1]' }
      ]
    }

    expect(getScribeConversationDescription(conversation)).toBe(
      'Summary Bonjour'
    )
  })

  it('describes a conversation without the fences', () => {
    const conversation = {
      messages: [
        { role: 'user', content: 'Write a greeting' },
        {
          role: 'assistant',
          content: 'Here:\n\n```insert\n**Bonjour** à _tous_\n```\n\nShort.'
        }
      ]
    }

    expect(getScribeConversationDescription(conversation)).toBe(
      'Here: Bonjour à tous Short.'
    )
  })
})

describe('makeScribeAnswerActions', () => {
  it('hands the answer and the action clicked', () => {
    const onAction = jest.fn()
    const [insert, replace] = makeScribeAnswerActions(
      [
        { name: 'insert', label: null },
        { name: 'replace', label: null }
      ],
      mockT,
      onAction
    )

    expect(insert.label).toBe('Insert')
    expect(replace.label).toBe('Replace')
    replace.onClick('Hello everyone')
    expect(onAction).toHaveBeenCalledWith({
      answerAction: 'replace',
      text: 'Hello everyone',
      format: 'markdown'
    })
  })

  it('names an action as the app does', () => {
    const [action] = makeScribeAnswerActions(
      [{ name: 'insert', label: 'Add to the note' }],
      mockT,
      jest.fn()
    )

    expect(action.label).toBe('Add to the note')
  })

  it('names an unknown action after itself', () => {
    const [action] = makeScribeAnswerActions(
      [{ name: 'create_task', label: null }],
      mockT,
      jest.fn()
    )

    expect(action.label).toBe('create_task')
  })
})

describe('makeScribeCapabilities', () => {
  const action = { name: 'insert_slide', description: 'add a slide' }

  it('hands the call and its params to the app', () => {
    const onCall = jest.fn()
    const [insertSlide] = makeScribeCapabilities(
      [{ name: 'insert_slide', label: 'Insert the slide', action }],
      mockT,
      onCall
    )

    expect(insertSlide.label).toBe('Insert the slide')
    expect(insertSlide.action).toEqual(action)
    expect(insertSlide.hasContent).toBe(false)
    insertSlide.onClick({ title: 'Risks', bullets: ['Delay'] }, 'ignored')
    expect(onCall).toHaveBeenCalledWith({
      capability: 'insert_slide',
      params: { title: 'Risks', bullets: ['Delay'] }
    })
  })

  it('hands the content the assistant wrote with the call', () => {
    const onCall = jest.fn()
    const [createDocument] = makeScribeCapabilities(
      [
        {
          name: 'create_document',
          label: 'Create',
          confirm: true,
          action: { name: 'create_document', content: { max_tokens: 1024 } }
        }
      ],
      mockT,
      onCall
    )

    expect(createDocument.hasContent).toBe(true)
    createDocument.onClick({ title: 'Report' }, '# Report\n\nAll is well.')
    expect(onCall).toHaveBeenCalledWith({
      capability: 'create_document',
      params: { title: 'Report' },
      text: '# Report\n\nAll is well.',
      format: 'markdown'
    })
  })

  it('gives the router the requests of the suggestions as examples', () => {
    const [insertSlide] = makeScribeCapabilities(
      [
        {
          name: 'insert_slide',
          label: null,
          confirm: false,
          action: {
            ...action,
            examples: ['Add a slide']
          }
        }
      ],
      mockT,
      jest.fn(),
      [
        { name: 'catalogue' },
        {
          name: 'new_slide',
          capability: 'insert_slide',
          message: 'Nouvelle diapositive après celle-ci'
        },
        {
          name: 'more',
          options: [
            {
              name: 'again',
              capability: 'insert_slide',
              message: 'Add a slide'
            },
            { name: 'other', capability: 'other', message: 'Other' },
            {
              name: 'empty',
              capability: 'insert_slide',
              message: ' '
            }
          ]
        }
      ]
    )

    expect(insertSlide.confirm).toBe(false)
    expect(insertSlide.action.examples).toEqual([
      'Add a slide',
      'Nouvelle diapositive après celle-ci'
    ])
  })

  it('has a label for a capability the app does not name', () => {
    const [insertSlide] = makeScribeCapabilities(
      [{ name: 'insert_slide', label: null, action }],
      mockT,
      jest.fn()
    )

    expect(insertSlide.label).toBe('Apply')
  })
})

describe('getScribeWording', () => {
  it('speaks of the text of the app', () => {
    expect(
      getScribeWording(mockT, { hasText: true, hasDocuments: true })
    ).toEqual({
      welcome: 'Ask me a question about your document',
      placeholder: 'Help me write'
    })
  })

  it('speaks of the files of the folder without a text', () => {
    expect(
      getScribeWording(mockT, { hasText: false, hasDocuments: true })
    ).toEqual({
      welcome: 'Answers are based only on files from',
      placeholder: 'Ask your Drive'
    })
  })

  it('speaks of the LLM alone once the documents are off', () => {
    expect(
      getScribeWording(mockT, { hasText: false, hasDocuments: false })
    ).toEqual({
      welcome: 'What would you like to work on today?',
      placeholder: 'Ask Twake AI'
    })
  })
})
