import {
  hasInsertBlocks,
  removeInsertFences,
  splitAnswerBlocks
} from '@/lib/scribeBlocks'

describe('splitAnswerBlocks', () => {
  it('splits the prose and the insert blocks of an answer', () => {
    expect(
      splitAnswerBlocks(
        'Here:\n\n```insert\nHello\n```\n\nand\n\n```insert\nBye\n```'
      )
    ).toEqual([
      { type: 'prose', text: 'Here:' },
      { type: 'block', text: 'Hello' },
      { type: 'prose', text: 'and' },
      { type: 'block', text: 'Bye' }
    ])
  })

  it('keeps the lines and the Markdown of a block', () => {
    expect(
      splitAnswerBlocks('~~~ insert \n# Title\n\n- **one**\n- two\n~~~')
    ).toEqual([{ type: 'block', text: '# Title\n\n- **one**\n- two' }])
  })

  it('closes a block with its own marker only', () => {
    expect(splitAnswerBlocks('~~~insert\nRun:\n```\nls\n```\n~~~')).toEqual([
      { type: 'block', text: 'Run:\n```\nls\n```' }
    ])
  })

  it('keeps an open block at the end as a block', () => {
    expect(
      splitAnswerBlocks('Here is **the** text:\n\n```insert\nHello wor')
    ).toEqual([
      { type: 'prose', text: 'Here is **the** text:' },
      { type: 'block', text: 'Hello wor' }
    ])
    expect(splitAnswerBlocks('Here:\n\n```insert')).toEqual([
      { type: 'prose', text: 'Here:' },
      { type: 'block', text: '' }
    ])
  })

  it('leaves other fences as prose', () => {
    const code = 'Run:\n\n```js\nconsole.log(1)\n```\n\nThen:\n\n```\nls\n```'
    // A fence of insert written inside a code block is code
    const quoted = 'Write:\n\n```md\n```insert\nHello\n```'

    expect(splitAnswerBlocks(code)).toEqual([{ type: 'prose', text: code }])
    expect(splitAnswerBlocks(quoted)).toEqual([{ type: 'prose', text: quoted }])
    expect(splitAnswerBlocks('```Insert\nHello\n```')).toEqual([
      { type: 'prose', text: '```Insert\nHello\n```' }
    ])
  })

  it('gives nothing for an empty answer', () => {
    expect(splitAnswerBlocks('')).toEqual([])
  })
})

describe('hasInsertBlocks', () => {
  it('tells whether an answer has an insert block', () => {
    expect(hasInsertBlocks('Here:\n\n```insert\nHello\n```')).toBe(true)
    expect(hasInsertBlocks('Here:\n\n```insert\nHel')).toBe(true)
    expect(hasInsertBlocks('Run:\n\n```js\nconsole.log(1)\n```')).toBe(false)
    expect(hasInsertBlocks('Bonjour')).toBe(false)
  })
})

describe('removeInsertFences', () => {
  it('removes the fences for a description', () => {
    expect(
      removeInsertFences(
        'Here:\n\n```insert\nHello **all**\n```\n\nand\n\n~~~insert\nBye\n~~~'
      )
    ).toBe('Here:\n\nHello **all**\n\nand\n\nBye')
    expect(removeInsertFences('Run:\n\n```js\nls\n```')).toBe(
      'Run:\n\n```js\nls\n```'
    )
  })
})
