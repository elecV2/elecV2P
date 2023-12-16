// 简单的 i18n 测试
// 待优化

import en from './locales/en.json'
import zh from './locales/zh.json'

function getLang() {
  let lang = ''
  if (location.search) {
    lang = new URLSearchParams(location.search).get('lang')
  }
  return lang || localStorage.getItem('lang') || navigator.language
}

const langset = {
  locale: getLang().startsWith('zh') ? 'zh-CN' : 'en',
  fallbackLocale: 'en',
}

const messages = {
  en, "zh-CN": zh,
}

function t(key) {
  const message = messages[langset.locale] || messages[langset.fallbackLocale]
  return message[key] || key
}

function ta(...keys) {
  const message = messages[langset.locale] || messages[langset.fallbackLocale]
  const jgap = message.join_gap
  return keys.map(key=>message[key] || key).join(jgap)
}

function setLang(lang = ''){
  if (lang.startsWith('zh')) {
    lang = 'zh-CN'
  } else {
    lang = 'en'
  }
  langset.locale = lang
  console.debug('locale lang set to', lang)
  localStorage.setItem('lang', lang)
  return lang
}

export { langset, t, ta, setLang }