// The app gives the tables of its text in HTML tags, as the Markdown of
// OnlyOffice does, and the LLM answers with them, often in a fence: the
// Markdown of cozy-ui draws GFM tables only. The text given back to the app
// keeps its HTML.

import { isClosing, readFence } from '@/lib/scribeBlocks'

// A table opens a line, as a block of HTML: a tag in a sentence or in
// inline code is not one
const TABLE_START = /^[ \t]*<table\b/im
// The info strings of a fence that may hold a table alone
const TABLE_FENCE_INFO = /^(?:html|markdown|md|text)?$/i

function findCellText(cell) {
  cell.querySelectorAll('br').forEach(br => br.replaceWith(' '))
  return cell.textContent.trim().replace(/\s+/g, ' ').replace(/\|/g, '\\|')
}

// A cell over several columns or rows leaves the others empty
function makeGrid(rows) {
  const grid = rows.map(() => [])
  rows.forEach((row, rowIndex) => {
    let column = 0
    for (const cell of row.cells) {
      while (grid[rowIndex][column] !== undefined) column += 1
      const rowSpan = Math.max(1, cell.rowSpan)
      for (let i = 0; i < rowSpan && rowIndex + i < rows.length; i += 1) {
        for (let j = 0; j < cell.colSpan; j += 1) {
          grid[rowIndex + i][column + j] =
            i === 0 && j === 0 ? findCellText(cell) : ''
        }
      }
      column += cell.colSpan
    }
  })
  return grid
}

// The first row is the header a GFM table needs
function makeGfmTable(html) {
  const table = new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector('table')
  const grid = makeGrid([...(table?.rows ?? [])])
  const width = Math.max(0, ...grid.map(cells => cells.length))
  if (width === 0) return ''

  const lines = grid.map(
    cells =>
      `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`
  )
  lines.splice(1, 0, `|${' --- |'.repeat(width)}`)
  return `\n\n${lines.join('\n')}\n\n`
}

// The end of the table opening at `start`, past the tables of its cells, or
// the end of a table still being written
function findTableEnd(text, start) {
  const tag = /<(\/?)table\b/gi
  tag.lastIndex = start
  let depth = 0
  let match
  while ((match = tag.exec(text))) {
    depth += match[1] ? -1 : 1
    if (depth === 0) return text.indexOf('>', match.index) + 1 || text.length
  }
  return text.length
}

function replaceTables(text, replace) {
  const start = text.search(TABLE_START)
  if (start === -1) return text
  const end = findTableEnd(text, start)
  return (
    text.slice(0, start) +
    replace(text.slice(start, end)) +
    replaceTables(text.slice(end), replace)
  )
}

const isTableAlone = body => replaceTables(body, () => '').trim() === ''

/**
 * The Markdown to show for a text: its HTML tables as GFM tables, out of
 * the fence that holds one alone. The tables of other fences stay code.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function showHtmlTables(markdown) {
  const shown = []
  let prose = []
  let fence = null

  const addProse = () => {
    if (prose.length > 0) {
      shown.push(replaceTables(prose.join('\n'), makeGfmTable))
    }
    prose = []
  }
  const addFence = closing => {
    if (
      TABLE_FENCE_INFO.test(fence.info) &&
      isTableAlone(fence.lines.join('\n'))
    ) {
      prose.push(...fence.lines)
    } else {
      addProse()
      shown.push(fence.opening, ...fence.lines)
      if (closing !== null) shown.push(closing)
    }
    fence = null
  }

  for (const line of markdown.split('\n')) {
    if (fence) {
      if (isClosing(line, fence.marker)) addFence(line)
      else fence.lines.push(line)
      continue
    }
    const opening = readFence(line)
    if (opening) fence = { ...opening, opening: line, lines: [] }
    else prose.push(line)
  }
  if (fence) addFence(null)
  addProse()

  return shown.join('\n')
}
