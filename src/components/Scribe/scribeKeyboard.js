const INSERT_INDEX = 1

/**
 * The buttons of each card of the answers, in the order of the page: a card
 * still written has none, and is left out
 *
 * @param {HTMLElement} root
 * @returns {HTMLElement[][]}
 */
export function findCards(root) {
  return Array.from(root.querySelectorAll('[data-scribe-card]'))
    .map(card => Array.from(card.querySelectorAll('button')))
    .filter(buttons => buttons.length > 0)
}

function focusButton(buttons, index) {
  buttons[Math.min(index, buttons.length - 1)].focus()
}

/**
 * Moves the focus from a button of a card: left and right within the card,
 * down and up to the same button of the next or previous card, down from the
 * last card and Escape to the composer
 *
 * @param {KeyboardEvent} event
 * @param {HTMLElement} root
 * @param {HTMLElement} composer
 * @returns {boolean} whether the key moved the focus
 */
export function handleCardKey(event, root, composer) {
  // A key with a modifier is a shortcut of the browser, as Alt+← for back
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return false
  }
  const cards = findCards(root)
  const cardIndex = cards.findIndex(buttons => buttons.includes(event.target))
  if (cardIndex === -1) return false
  const buttons = cards[cardIndex]
  const index = buttons.indexOf(event.target)

  switch (event.key) {
    case 'ArrowLeft':
      focusButton(buttons, (index - 1 + buttons.length) % buttons.length)
      return true
    case 'ArrowRight':
      focusButton(buttons, (index + 1) % buttons.length)
      return true
    case 'ArrowDown':
      if (cardIndex === cards.length - 1) composer.focus()
      else focusButton(cards[cardIndex + 1], index)
      return true
    case 'ArrowUp':
      if (cardIndex === 0) return false
      focusButton(cards[cardIndex - 1], index)
      return true
    case 'Escape':
      composer.focus()
      return true
    default:
      return false
  }
}

/**
 * Focuses the Insert button of the latest card, or its last button when it
 * has fewer
 *
 * @param {HTMLElement} root
 * @returns {boolean} whether there was a card
 */
export function focusLatestInsert(root) {
  const cards = findCards(root)
  if (cards.length === 0) return false
  focusButton(cards[cards.length - 1], INSERT_INDEX)
  return true
}
