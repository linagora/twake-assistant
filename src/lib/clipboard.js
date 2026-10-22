import { marked } from 'marked'

function toHtml(markdown) {
  const html = marked.parse(markdown, { async: false }).trim()
  const paragraph = /^<p>([\s\S]*)<\/p>$/.exec(html)

  return paragraph && !/<\/?p>/.test(paragraph[1]) ? paragraph[1] : html
}

/**
 * Puts an answer, in Markdown, on the clipboard as HTML and as plain text:
 * the clipboard may be missing (plain HTTP) or limited to text (old browsers)
 *
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function copyAnswer(text) {
  const clipboard = navigator.clipboard
  if (!clipboard) return

  if (typeof ClipboardItem !== 'undefined' && clipboard.write) {
    await clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([toHtml(text)], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })
    ])
  } else {
    await clipboard.writeText?.(text)
  }
}
