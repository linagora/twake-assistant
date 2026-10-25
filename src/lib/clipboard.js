import { marked } from 'marked'

import { showHtmlTables } from '@/lib/htmlTables'

function toHtml(markdown) {
  const html = marked.parse(markdown, { async: false }).trim()
  const paragraph = /^<p>([\s\S]*)<\/p>$/.exec(html)

  return paragraph && !/<\/?p>/.test(paragraph[1]) ? paragraph[1] : html
}

/**
 * Puts an answer, in Markdown, on the clipboard as HTML and as plain text,
 * as it is shown: its tables as tables, not as the HTML of the app. The
 * clipboard may be missing (plain HTTP) or limited to text (old browsers).
 *
 * @param {string} answer
 * @returns {Promise<boolean>} whether there was a clipboard to write to
 */
export async function copyAnswer(answer) {
  const text = showHtmlTables(answer).trim()
  const clipboard = navigator.clipboard

  if (typeof ClipboardItem !== 'undefined' && clipboard?.write) {
    await clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([toHtml(text)], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })
    ])
    return true
  }

  if (clipboard?.writeText) {
    await clipboard.writeText(text)
    return true
  }

  return false
}
