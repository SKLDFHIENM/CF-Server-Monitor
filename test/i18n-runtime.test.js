import test from 'node:test'
import assert from 'node:assert/strict'
import { STORAGE } from '../src/frontend/utils/constants.js'

globalThis.localStorage = {
  store: new Map(),
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null
  },
  setItem(key, value) {
    this.store.set(key, String(value))
  }
}
globalThis.window = { dispatchEvent() {} }
globalThis.CustomEvent = class {
  constructor(type, init) {
    this.type = type
    this.detail = init?.detail
  }
}

const i18n = await import('../src/frontend/utils/i18n.js')

test('setLanguage loads a locale on demand and updates translations', async () => {
  assert.equal(await i18n.setLanguage('ja'), true)
  assert.equal(i18n.getLanguage(), 'ja')
  assert.equal(i18n.t('theme'), 'テーマ')

  assert.equal(await i18n.setLanguage('zh-TW'), true)
  assert.equal(i18n.getLanguage(), 'zh-TW')
  assert.equal(i18n.t('theme'), '主題')

  assert.equal(await i18n.setLanguage('fr'), true)
  assert.equal(i18n.t('theme'), 'Thème')
})

test('setLanguage rejects unknown languages without changing the current one', async () => {
  assert.equal(await i18n.setLanguage('ko'), false)
  assert.equal(i18n.getLanguage(), 'fr')
})

test('applyDefaultLanguage respects saved, site, and browser language preferences', async (t) => {
  const cases = [
    { name: 'first visit uses the site language', site: 'zh', browser: 'ja-JP', expected: 'zh', theme: '主题' },
    { name: 'first visit loads a traditional Chinese site language', site: 'zh-TW', browser: 'en-US', expected: 'zh-TW', theme: '主題' },
    { name: 'automatic site language follows the browser', site: 'auto', browser: 'ja-JP', expected: 'ja', theme: 'テーマ' },
    { name: 'missing site language follows the browser', browser: 'fr-FR', expected: 'fr', theme: 'Thème' },
    { name: 'unknown browser language falls back to English', site: 'auto', browser: 'de-DE', expected: 'en', theme: 'Theme' },
    { name: 'saved language overrides the site language', stored: 'en', site: 'zh', browser: 'ja-JP', expected: 'en', theme: 'Theme' },
    { name: 'saved automatic preference follows the browser', stored: 'auto', site: 'zh', browser: 'zh-HK', expected: 'zh-TW', theme: '主題' },
    { name: 'invalid saved language uses the site language', stored: 'ko', site: 'zh', browser: 'ja-JP', expected: 'zh', theme: '主题' },
    { name: 'empty saved language uses the site language', stored: '', site: 'zh', browser: 'ja-JP', expected: 'zh', theme: '主题' }
  ]

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      localStorage.store.clear()
      if (scenario.stored !== undefined) {
        localStorage.setItem(STORAGE.LANGUAGE_PREFERENCE, scenario.stored)
      }
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { language: scenario.browser, languages: [scenario.browser] }
      })

      assert.equal(await i18n.applyDefaultLanguage(scenario.site), scenario.expected)
      assert.equal(i18n.getLanguage(), scenario.expected)
      assert.equal(i18n.t('theme'), scenario.theme)
      assert.equal(localStorage.getItem(STORAGE.LANGUAGE_PREFERENCE), scenario.stored ?? null)
    })
  }
})
