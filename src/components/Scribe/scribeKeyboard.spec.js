import {
  findCards,
  focusLatestInsert,
  handleCardKey
} from '@/components/Scribe/scribeKeyboard'

const getButton = name =>
  Array.from(document.querySelectorAll('button')).find(
    button => button.textContent === name
  )

const getComposer = () => document.querySelector('textarea')

function press(key) {
  return handleCardKey(
    { key, target: document.activeElement },
    document.body,
    getComposer()
  )
}

describe('scribeKeyboard', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-scribe-card>
        <p>The first answer</p>
        <button>Copy 1</button>
        <button>Insert 1</button>
        <button>Replace 1</button>
      </div>
      <div data-scribe-card>
        <button>Copy 2</button>
        <button>Insert 2</button>
      </div>
      <textarea></textarea>
    `
  })

  it('finds the buttons of each card, without a card still written', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div data-scribe-card><p>Hel</p></div>'
    )

    expect(
      findCards(document.body).map(buttons =>
        buttons.map(button => button.textContent)
      )
    ).toEqual([
      ['Copy 1', 'Insert 1', 'Replace 1'],
      ['Copy 2', 'Insert 2']
    ])
  })

  it('moves within a card and wraps', () => {
    getButton('Copy 1').focus()

    expect(press('ArrowRight')).toBe(true)
    expect(document.activeElement).toBe(getButton('Insert 1'))
    press('ArrowRight')
    expect(document.activeElement).toBe(getButton('Replace 1'))
    press('ArrowRight')
    expect(document.activeElement).toBe(getButton('Copy 1'))
    expect(press('ArrowLeft')).toBe(true)
    expect(document.activeElement).toBe(getButton('Replace 1'))
  })

  it('moves to the same button of the next card', () => {
    getButton('Copy 1').focus()

    expect(press('ArrowDown')).toBe(true)
    expect(document.activeElement).toBe(getButton('Copy 2'))

    getButton('Replace 1').focus()
    press('ArrowDown')
    expect(document.activeElement).toBe(getButton('Insert 2'))
  })

  it('moves to the same button of the previous card', () => {
    getButton('Insert 2').focus()

    expect(press('ArrowUp')).toBe(true)
    expect(document.activeElement).toBe(getButton('Insert 1'))
  })

  it('goes back to the composer after the last card', () => {
    getButton('Insert 2').focus()

    expect(press('ArrowDown')).toBe(true)
    expect(document.activeElement).toBe(getComposer())
  })

  it('does not move up from the first card', () => {
    getButton('Insert 1').focus()

    expect(press('ArrowUp')).toBe(false)
    expect(document.activeElement).toBe(getButton('Insert 1'))
  })

  it('returns to the composer on Escape', () => {
    getButton('Replace 1').focus()

    expect(press('Escape')).toBe(true)
    expect(document.activeElement).toBe(getComposer())
  })

  it('leaves the other keys, and the keys out of a card, alone', () => {
    getButton('Insert 1').focus()
    expect(press('Enter')).toBe(false)
    expect(document.activeElement).toBe(getButton('Insert 1'))

    getComposer().focus()
    expect(press('ArrowUp')).toBe(false)
    expect(press('Escape')).toBe(false)
    expect(document.activeElement).toBe(getComposer())
  })

  it('focuses the insert button of the latest card', () => {
    expect(focusLatestInsert(document.body)).toBe(true)
    expect(document.activeElement).toBe(getButton('Insert 2'))

    document.body.innerHTML =
      '<div data-scribe-card><button>Copy</button></div><textarea></textarea>'
    getComposer().focus()
    expect(focusLatestInsert(document.body)).toBe(true)
    expect(document.activeElement).toBe(getButton('Copy'))

    document.body.innerHTML = '<textarea></textarea>'
    getComposer().focus()
    expect(focusLatestInsert(document.body)).toBe(false)
    expect(document.activeElement).toBe(getComposer())
  })
})
