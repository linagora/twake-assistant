// Updates the prompts of the scribe from the catalogue published by
// linagora/ai-prompts, the one Twake Mail uses too.
// Usage: yarn prompts:update
import { writeFile } from 'node:fs/promises'

const URL = 'https://files.twake.app/prompts/scribe/latest.json'
const OUTPUT = new globalThis.URL(
  '../src/lib/scribePrompts.json',
  import.meta.url
)

const response = await fetch(URL)
if (!response.ok) throw new Error(`${URL}: ${response.status}`)
const catalogue = await response.json()
if (!Array.isArray(catalogue.prompts)) throw new Error(`${URL}: no prompts`)

await writeFile(OUTPUT, `${JSON.stringify(catalogue, null, 2)}\n`)
process.stdout.write(
  `${catalogue.prompts.length} prompts, generated at ${catalogue.generatedAt}\n`
)
