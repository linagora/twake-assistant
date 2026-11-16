import { showHtmlTables, unfenceTables } from '@/lib/htmlTables'

// As OnlyOffice gives a table, and the LLM answers with it
const TABLE = `<table>
  <tr>
   <td>

**Métrique**

</td>
   <td>

**Valeur**

</td>
  </tr>
  <tr>
   <td>

Ventes

</td>
   <td>

12 M$

</td>
  </tr>
</table>`

const GFM = `| **Métrique** | **Valeur** |
| --- | --- |
| Ventes | 12 M$ |`

describe('showHtmlTables', () => {
  it('shows an HTML table as a GFM table', () => {
    expect(showHtmlTables(`Avant\n\n${TABLE}\n\nAprès`)).toBe(
      `Avant\n\n\n\n${GFM}\n\n\n\nAprès`
    )
  })

  it('takes a table alone out of its fence', () => {
    for (const info of ['', 'html', 'markdown']) {
      expect(showHtmlTables(`\`\`\`${info}\n${TABLE}\n\`\`\``).trim()).toBe(GFM)
    }
  })

  it('takes a GFM table alone out of its fence', () => {
    // As Mistral writes it, its columns padded
    const table =
      '| Type       | Description |\n|------------|-------------|\n| Preventive | Two visits  |'
    const text = `Here is the table:\n\n\`\`\`\n${table}\n\`\`\`\n\nDone.`
    expect(showHtmlTables(text)).toBe(`Here is the table:\n\n${table}\n\nDone.`)
    expect(showHtmlTables(`\`\`\`markdown\n${GFM}\n\`\`\``).trim()).toBe(GFM)
  })

  it('takes a GFM table out of a fence right after a sentence', () => {
    expect(showHtmlTables(`Voici :\n\`\`\`\n${GFM}\n\`\`\``)).toBe(
      `Voici :\n\n${GFM}`
    )
  })

  it('leaves a fence of lines with pipes that are not a table', () => {
    const text = '```\na | b\nc | d\n```'
    expect(showHtmlTables(text)).toBe(text)
  })

  it('leaves a fence whose delimiter row does not match its header', () => {
    const text = '```\n| a | b |\n|---|\n| c | d |\n```'
    expect(showHtmlTables(text)).toBe(text)
  })

  it('leaves a fence that holds more than a table', () => {
    const text = `\`\`\`html\n${TABLE}\n<p>x</p>\n\`\`\``
    const shown = showHtmlTables(text)
    expect(shown.startsWith('```html\n')).toBe(true)
    expect(shown.endsWith('<p>x</p>\n```')).toBe(true)
  })

  it('leaves the tables of other fences as code', () => {
    const text = `\`\`\`html\n${TABLE}\n<p>x</p>\n\`\`\`\n\n\`\`\`js\n${TABLE}\n\`\`\``
    expect(showHtmlTables(text)).toBe(text)
  })

  it('takes a table out of its fence after another fence', () => {
    const text = `\`\`\`js\nx\n\`\`\`\n\nTexte\n\n\`\`\`\n${TABLE}\n\`\`\``
    expect(showHtmlTables(text)).not.toMatch(/<table>/)
    expect(showHtmlTables(text).trim().endsWith(GFM)).toBe(true)
  })

  it('leaves a table tag in a sentence', () => {
    const text = 'Use the `<table>` tag, then a `<tr>` for each row.'
    expect(showHtmlTables(text)).toBe(text)
  })

  it('shows a table in a cell in the text of its cell', () => {
    const table =
      '<table><tr><td><table><tr><td>in</td></tr></table></td><td>b</td></tr></table>'
    expect(showHtmlTables(`${table}\n\nAprès`).trim()).toBe(
      '| in | b |\n| --- | --- |\n\n\n\nAprès'
    )
  })

  it('shows a table still being written', () => {
    const text =
      '```\n<table>\n  <tr>\n   <td>\n\nVentes\n\n</td>\n   <td>\n\n12'
    expect(showHtmlTables(text).trim()).toBe('| Ventes | 12 |\n| --- | --- |')
  })

  it('shows nothing of a table without a cell yet', () => {
    expect(showHtmlTables('Voici :\n\n<table>\n  <tr>').trim()).toBe('Voici :')
  })

  it('leaves the cells a merged cell covers empty', () => {
    const table =
      '<table><tr><td colspan="2">A</td><td rowspan="2">B</td></tr><tr><td>C</td><td>D</td></tr></table>'
    expect(showHtmlTables(table).trim()).toBe(
      '| A |  | B |\n| --- | --- | --- |\n| C | D |  |'
    )
  })

  it('escapes the pipes of a cell, and joins its lines', () => {
    const table =
      '<table><tr><td>a | b</td><td>\n\nun\n\ndeux<br>trois\n\n</td></tr></table>'
    expect(showHtmlTables(table).trim()).toBe(
      '| a \\| b | un deux trois |\n| --- | --- |'
    )
  })

  it('leaves a text without a table as it is', () => {
    const text = 'Un **texte**\n\n```js\nconst a = 1\n```'
    expect(showHtmlTables(text)).toBe(text)
  })
})

describe('unfenceTables', () => {
  it('takes the tables alone out of their fence, the HTML ones still HTML', () => {
    const text = `Voici :\n\n\`\`\`html\n${TABLE}\n\`\`\`\n\n\`\`\`\n${GFM}\n\`\`\``
    expect(unfenceTables(text)).toBe(`Voici :\n\n${TABLE}\n\n${GFM}`)
  })

  it('leaves a text without a fenced table as it is', () => {
    const text = `Un **texte**\n\n${TABLE}\n\n\`\`\`js\nconst a = 1\n\`\`\``
    expect(unfenceTables(text)).toBe(text)
  })
})
