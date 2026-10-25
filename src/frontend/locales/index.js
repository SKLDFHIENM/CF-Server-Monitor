import {
  AUTO_LANGUAGE,
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
  LANGUAGE_MAP,
  SUPPORTED_LANGUAGES
} from '../../shared/languages.js'
import en from './en.js'

const LOCALE_LOADERS = Object.freeze({
  en: () => Promise.resolve({ default: en }),
  zh: () => import('./zh.js'),
  'zh-TW': () => import('./zh-TW.js'),
  ja: () => import('./ja.js'),
  id: () => import('./id.js'),
  fr: () => import('./fr.js'),
  es: () => import('./es.js')
})

// 展示信息来自 shared/languages.js，这里只补上按需加载函数。
export const LANGUAGES = Object.freeze(SUPPORTED_LANGUAGES.map((language) => Object.freeze({
  ...language,
  load: LOCALE_LOADERS[language.code]
})))

export {
  AUTO_LANGUAGE,
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
  LANGUAGE_MAP,
  en
}
