// The info string of the fenced blocks the scribe asks the LLM to put each
// text meant for the document in (see `scribe.instructions`)
const INSERT_INFO = 'insert'

const FENCE = /^(`{3,}|~{3,})\s*(.*?)\s*$/

export function readFence(line) {
  const match = line.match(FENCE)
  return match ? { marker: match[1], info: match[2] } : null
}

// As in CommonMark: a fence of the same character, as long at least, and
// without an info string
export function isClosing(line, marker) {
  const fence = readFence(line)
  return (
    fence !== null &&
    fence.info === '' &&
    fence.marker[0] === marker[0] &&
    fence.marker.length >= marker.length
  )
}

/**
 * @typedef {{ type: 'prose', text: string }|{ type: 'block', text: string }} AnswerPart
 */

/**
 * Splits an answer of the LLM into its prose and its insert blocks: a fence
 * whose info string is `insert` opens a block up to its closing fence, or
 * to the end of an answer still written. Other fences, and what they hold,
 * stay prose.
 *
 * @param {string} text - the answer, in Markdown
 * @returns {AnswerPart[]} without empty prose
 */
export function splitAnswerBlocks(text) {
  const parts = []
  let prose = []
  let block = null
  let codeMarker = null

  const addProse = () => {
    const proseText = prose.join('\n').trim()
    if (proseText !== '') parts.push({ type: 'prose', text: proseText })
    prose = []
  }
  const addBlock = () => {
    parts.push({ type: 'block', text: block.lines.join('\n') })
    block = null
  }

  for (const line of text.split('\n')) {
    if (block) {
      if (isClosing(line, block.marker)) {
        addBlock()
      } else {
        block.lines.push(line)
      }
      continue
    }
    if (codeMarker) {
      if (isClosing(line, codeMarker)) codeMarker = null
      prose.push(line)
      continue
    }
    const fence = readFence(line)
    if (fence?.info === INSERT_INFO) {
      addProse()
      block = { marker: fence.marker, lines: [] }
      continue
    }
    if (fence) codeMarker = fence.marker
    prose.push(line)
  }
  if (block) addBlock()
  addProse()

  return parts
}

/**
 * @param {string} text - an answer of the LLM
 * @returns {boolean} whether it has an insert block, even one still open
 */
export function hasInsertBlocks(text) {
  return splitAnswerBlocks(text).some(part => part.type === 'block')
}

/**
 * @param {string} text - an answer of the LLM
 * @returns {string} the answer without the fences of its insert blocks: the
 * text of the blocks is kept, as Markdown
 */
export function removeInsertFences(text) {
  return splitAnswerBlocks(text)
    .map(part => part.text)
    .join('\n\n')
}
