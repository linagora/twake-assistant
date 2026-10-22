import german from '@/locales/de.json'
import english from '@/locales/en.json'
import spanish from '@/locales/es.json'
import french from '@/locales/fr.json'
import italian from '@/locales/it.json'
import russian from '@/locales/ru.json'
import vietnamese from '@/locales/vi.json'

const locales = {
  fr: french,
  ru: russian,
  vi: vietnamese,
  de: german,
  es: spanish,
  it: italian
}

function flatten(value, path = []) {
  return typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, child]) =>
        flatten(child, [...path, key])
      )
    : [[path.join('.'), value]]
}

function keysOf(locale) {
  return flatten(locale)
    .map(([key]) => key)
    .sort()
}

function emptyKeysOf(locale) {
  return flatten(locale)
    .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
    .map(([key]) => key)
}

describe('locales', () => {
  it.each(Object.entries(locales))('%s has the keys of en', (_, locale) => {
    expect(keysOf(locale)).toEqual(keysOf(english))
  })

  it.each(Object.entries({ en: english, ...locales }))(
    '%s has no empty value',
    (_, locale) => {
      expect(emptyKeysOf(locale)).toEqual([])
    }
  )

  it('reports an empty value', () => {
    expect(emptyKeysOf({ a: { b: 'B', c: '' }, d: ' ' })).toEqual(['a.c', 'd'])
  })
})
