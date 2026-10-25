import { ref, reactive, computed } from 'vue'
import { STORAGE } from './constants.js'
import {
  AUTO_LANGUAGE,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_CODES,
  LANGUAGE_MAP,
  en as defaultLocale
} from '../locales/index.js'
import { isSupportedLanguage, normalizeLanguagePreference, normalizeNotificationLanguagePreference } from '../../shared/languages.js'

const LANGUAGE_STORAGE_KEY = STORAGE.LANGUAGE_PREFERENCE
let defaultLanguage = AUTO_LANGUAGE

// 默认语言随主包一起加载，其余语言在切换或启动命中时按需加载。
export const translations = reactive({ [DEFAULT_LANGUAGE]: defaultLocale })
const loadedLanguages = new Set([DEFAULT_LANGUAGE])
const pendingLoads = new Map()

const matchesBrowserLanguage = (browserLang, language) => {
  if (!language) return false
  const value = String(browserLang || '').trim().toLowerCase().replace(/_/g, '-')
  if (!value) return false
  const aliases = language.browserAliases?.length ? language.browserAliases : [language.code]
  return aliases.some((alias) => value === alias || value.startsWith(`${alias}-`))
}

// 同一浏览器标签可能命中多个语言（如 zh-TW 同时命中 zh 与 zh-TW），取别名最长的那个。
const findBrowserLanguage = (browserLang) => {
  const value = String(browserLang || '').trim().toLowerCase().replace(/_/g, '-')
  if (!value) return null
  let matched = null
  let matchedLength = 0
  for (const language of LANGUAGES) {
    const aliases = language.browserAliases?.length ? language.browserAliases : [language.code.toLowerCase()]
    for (const alias of aliases) {
      if (alias.length > matchedLength && (value === alias || value.startsWith(`${alias}-`))) {
        matched = language
        matchedLength = alias.length
      }
    }
  }
  return matched
}

export const isChineseBrowserLanguage = (lang) => matchesBrowserLanguage(lang, LANGUAGE_MAP.zh)

export const isSpanishBrowserLanguage = (lang) => matchesBrowserLanguage(lang, LANGUAGE_MAP.es)

export const getBrowserLanguage = () => {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE
  const languages = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language]
  for (const lang of languages) {
    const matched = findBrowserLanguage(lang)
    if (matched) return matched.code
  }
  return DEFAULT_LANGUAGE
}

export const resolveLanguagePreference = (lang) => {
  const value = normalizeLanguagePreference(lang)
  return value === AUTO_LANGUAGE ? getBrowserLanguage() : value
}

const currentLang = ref(resolveLanguagePreference(localStorage.getItem(LANGUAGE_STORAGE_KEY) || defaultLanguage))

const loadLanguage = (code) => {
  if (loadedLanguages.has(code)) return Promise.resolve(true)
  if (pendingLoads.has(code)) return pendingLoads.get(code)
  const language = LANGUAGES.find((item) => item.code === code)
  if (!language || typeof language.load !== 'function') return Promise.resolve(false)
  const promise = language.load()
    .then((module) => {
      const locale = module?.default
      if (!locale || typeof locale !== 'object') return false
      translations[code] = locale
      loadedLanguages.add(code)
      return true
    })
    .catch((error) => {
      console.error(`Failed to load language: ${code}`, error)
      return false
    })
    .finally(() => {
      pendingLoads.delete(code)
    })
  pendingLoads.set(code, promise)
  return promise
}

export const t = (key) => {
  return translations[currentLang.value]?.[key] || translations[DEFAULT_LANGUAGE]?.[key] || key
}

export const setLanguage = async (lang) => {
  const resolvedLang = normalizeLanguagePreference(lang, '')
  const loaded = await loadLanguage(resolvedLang)
  if (!loaded) return false
  currentLang.value = resolvedLang
  localStorage.setItem(LANGUAGE_STORAGE_KEY, resolvedLang)
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: resolvedLang } }))
  return true
}

export const getLanguage = () => currentLang.value

export const applyDefaultLanguage = async (lang) => {
  defaultLanguage = normalizeLanguagePreference(lang)
  // 没有有效的本地偏好时使用站点默认语言，再将 auto 解析为浏览器语言。
  const storedLanguage = normalizeLanguagePreference(localStorage.getItem(LANGUAGE_STORAGE_KEY), defaultLanguage)
  const resolvedLang = resolveLanguagePreference(storedLanguage)
  const loaded = await loadLanguage(resolvedLang)
  const nextLang = loaded ? resolvedLang : DEFAULT_LANGUAGE
  currentLang.value = nextLang
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: nextLang } }))
  return nextLang
}

export const useTranslation = () => {
  const trans = computed(() => translations[currentLang.value] || translations[DEFAULT_LANGUAGE])
  return trans
}

export {
  AUTO_LANGUAGE,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_CODES,
  LANGUAGE_MAP,
  currentLang,
  isSupportedLanguage,
  normalizeLanguagePreference,
  normalizeNotificationLanguagePreference
}
