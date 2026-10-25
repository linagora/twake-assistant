import { marked } from 'marked'

function toHtml(markdown) {
  const html = marked.parse(markdown, { async: false }).trim()
  const paragraph = /^<p>([\s\S]*)<\/p>$/.exec(html)

  return paragraph && !/<\/?p>/.test(paragraph[1]) ? paragraph[1] : html
}

async function writeClipboard(html, text) {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    return false
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' })
    })
  ])
  return true
}

// The browser runs the copy command of a click even in a frame whose page
// gives it no clipboard-write permission, as the frame of an intent
function copyWithCommand(html, text) {
  const handleCopy = event => {
    event.clipboardData.setData('text/html', html)
    event.clipboardData.setData('text/plain', text)
    event.preventDefault()
  }

  document.addEventListener('copy', handleCopy)
  try {
    return document.execCommand('copy')
  } finally {
    document.removeEventListener('copy', handleCopy)
  }
}

/**
 * Puts an answer, in Markdown, on the clipboard as HTML and as plain text:
 * the Clipboard API may be missing (plain HTTP, old browsers) or refused (a
 * frame without the permission), and the copy command takes its place
 *
 * @param {string} text
 * @returns {Promise<boolean>} whether the answer was copied
 */
export async function copyAnswer(text) {
  const html = toHtml(text)

  try {
    if (await writeClipboard(html, text)) return true
  } catch {
    // Refused: the copy command may be allowed
  }

  return copyWithCommand(html, text)
}
