import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_CODES } from '../src/frontend/locales/index.js'
import { normalizeDefaultLanguage } from '../src/utils/settings.js'

const localesDir = fileURLToPath(new URL('../src/frontend/locales/', import.meta.url))

const locales = {}
for (const code of LANGUAGE_CODES) {
  const module = await import(new URL(`../src/frontend/locales/${code}.js`, import.meta.url))
  locales[code] = module.default
}

const baseKeys = Object.keys(locales[DEFAULT_LANGUAGE]).sort()
const placeholdersOf = (value) => [...String(value).matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort()

test('locale files expose the same keys as the default locale', () => {
  for (const code of LANGUAGE_CODES) {
    assert.deepEqual(Object.keys(locales[code]).sort(), baseKeys, `locale "${code}" keys differ from ${DEFAULT_LANGUAGE}`)
  }
})

test('locale source files do not contain duplicate keys', () => {
  for (const code of LANGUAGE_CODES) {
    const source = readFileSync(path.join(localesDir, `${code}.js`), 'utf8')
    const keys = [...source.matchAll(/^  ([A-Za-z0-9_]+):/gm)].map((match) => match[1])
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index)
    assert.deepEqual([...new Set(duplicates)], [], `locale "${code}" has duplicate keys`)
  }
})

test('locale values keep the same interpolation placeholders as the default locale', () => {
  for (const code of LANGUAGE_CODES) {
    if (code === DEFAULT_LANGUAGE) continue
    for (const key of baseKeys) {
      assert.deepEqual(
        placeholdersOf(locales[code][key]),
        placeholdersOf(locales[DEFAULT_LANGUAGE][key]),
        `locale "${code}" placeholders differ for "${key}"`
      )
    }
  }
})

test('locales do not leave values empty when the default locale has text', () => {
  for (const code of LANGUAGE_CODES) {
    if (code === DEFAULT_LANGUAGE) continue
    for (const key of baseKeys) {
      if (String(locales[DEFAULT_LANGUAGE][key]).trim() === '') continue
      assert.notEqual(String(locales[code][key]).trim(), '', `locale "${code}" has an empty value for "${key}"`)
    }
  }
})

test('language registry covers every locale file and defines loaders', () => {
  const localeFiles = readdirSync(localesDir)
    .filter((file) => file.endsWith('.js') && file !== 'index.js')
    .map((file) => file.replace(/\.js$/, ''))
    .sort()
  assert.deepEqual(localeFiles, [...LANGUAGE_CODES].sort())
  assert.ok(LANGUAGE_CODES.includes(DEFAULT_LANGUAGE))
  for (const language of LANGUAGES) {
    assert.equal(typeof language.load, 'function', `language "${language.code}" is missing a loader`)
    assert.ok(language.nativeLabel, `language "${language.code}" is missing nativeLabel`)
    assert.ok(language.browserAliases?.length, `language "${language.code}" is missing browserAliases`)
  }
})

test('backend accepts every registered language', () => {
  for (const code of LANGUAGE_CODES) {
    assert.equal(normalizeDefaultLanguage(code), code)
  }
  assert.equal(normalizeDefaultLanguage(' auto '), 'auto')
  assert.equal(normalizeDefaultLanguage('zh-tw'), 'zh-TW')
  assert.equal(normalizeDefaultLanguage('ko'), 'auto')
})
