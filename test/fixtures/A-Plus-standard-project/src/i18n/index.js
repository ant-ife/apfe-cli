/**
 * Default language
 */
const _default = 'en_US'

/**
 * detected language
 */
const _lang = getLang() || _default

export const langPkgs = {
  'en_US': r => require.ensure([], () => r(require('./locales/en_US')), 'en_US'),
  'zh_CN': r => require.ensure([], () => r(require('./locales/zh_CN')), 'zh_CN'),
}

export const language = langPkgs.hasOwnProperty(_lang) ? _lang : _default

function getLang () {
  const localeMatches = navigator.userAgent.match(/Language\/([\w-]+)/)
  const locale = localeMatches ? localeMatches[1] : navigator.language

  if (/zh[_-](cn|hans)/i.test(locale)) {
    return 'zh_CN'
  } else if (/zh[_-](hk|tw|hant)/i.test(locale)) {
    return 'zh_HK'
  } else if (/en/i.test(locale)) {
    return 'en_US'
  }

  return ''
}
