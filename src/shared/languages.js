export const AUTO_LANGUAGE = 'auto'
export const DEFAULT_LANGUAGE = 'en'

// 前后端共用的语言清单。新增语言：这里补一条，并在 src/frontend/locales/ 下新增 locale 文件、在 locales/index.js 补加载函数。
export const SUPPORTED_LANGUAGES = Object.freeze([
  Object.freeze({
    code: 'zh',
    nativeLabel: '简体中文',
    browserAliases: Object.freeze(['zh', 'cmn', 'yue', 'wuu'])
  }),
  Object.freeze({
    code: 'zh-TW',
    nativeLabel: '繁體中文',
    browserAliases: Object.freeze(['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant'])
  }),
  Object.freeze({
    code: 'en',
    nativeLabel: 'English',
    browserAliases: Object.freeze(['en'])
  }),
  Object.freeze({
    code: 'ja',
    nativeLabel: '日本語',
    browserAliases: Object.freeze(['ja'])
  }),
  Object.freeze({
    code: 'id',
    nativeLabel: 'Indonesia',
    browserAliases: Object.freeze(['id', 'in'])
  }),
  Object.freeze({
    code: 'fr',
    nativeLabel: 'Français',
    browserAliases: Object.freeze(['fr'])
  }),
  Object.freeze({
    code: 'es',
    nativeLabel: 'Español',
    browserAliases: Object.freeze(['es'])
  })
])

export const LANGUAGE_CODES = Object.freeze(SUPPORTED_LANGUAGES.map((language) => language.code))

export const LANGUAGE_MAP = Object.freeze(SUPPORTED_LANGUAGES.reduce((map, language) => {
  map[language.code] = language
  return map
}, {}))

const LANGUAGE_LOOKUP = Object.freeze(LANGUAGE_CODES.reduce((map, code) => {
  map[code.toLowerCase()] = code
  return map
}, {}))

export const isSupportedLanguage = (lang) => Boolean(LANGUAGE_LOOKUP[String(lang || '').trim().toLowerCase()])

export const normalizeLanguagePreference = (lang, fallback = AUTO_LANGUAGE) => {
  const value = String(lang || '').trim().toLowerCase()
  if (value === AUTO_LANGUAGE) return AUTO_LANGUAGE
  if (LANGUAGE_LOOKUP[value]) return LANGUAGE_LOOKUP[value]
  return LANGUAGE_LOOKUP[String(fallback || '').trim().toLowerCase()] || AUTO_LANGUAGE
}

// 支持通知文案的语种。与界面语言解耦：新增界面语言后，需在 src/services/notificationMessages.js 补齐文案再登记到这里。
export const NOTIFICATION_LANGUAGE_CODES = Object.freeze(['zh', 'zh-TW', 'en', 'ja', 'id', 'fr', 'es'])
export const DEFAULT_NOTIFICATION_LANGUAGE = 'zh'

const NOTIFICATION_LANGUAGE_LOOKUP = Object.freeze(NOTIFICATION_LANGUAGE_CODES.reduce((map, code) => {
  map[code.toLowerCase()] = code
  return map
}, {}))

export const isNotificationLanguage = (lang) => Boolean(NOTIFICATION_LANGUAGE_LOOKUP[String(lang || '').trim().toLowerCase()])

export const normalizeNotificationLanguagePreference = (lang, fallback = DEFAULT_NOTIFICATION_LANGUAGE) => {
  const value = String(lang || '').trim().toLowerCase()
  if (NOTIFICATION_LANGUAGE_LOOKUP[value]) return NOTIFICATION_LANGUAGE_LOOKUP[value]
  return NOTIFICATION_LANGUAGE_LOOKUP[String(fallback || '').trim().toLowerCase()] || DEFAULT_NOTIFICATION_LANGUAGE
}
