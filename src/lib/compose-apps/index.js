import Ware from '../ware'
import assets from './plugins/assets'
import router from './plugins/router'
import store from './plugins/store'
import i18n from './plugins/i18n'
import spm from './plugins/spm'
import styles from './plugins/styles'
import readSrc from './read-src'

export const defaultOptions = {
  webpackImportAlias: '~',
}

export const composeApps = async (src, config, ...apps) => {
  config = { ...defaultOptions, ...config }
  const ware = new Ware()
  ware
    .use(assets)
    .use(router)
    .use(store)
    .use(i18n)
    .use(spm)
    .use(styles)

  if (Array.isArray(config.plugins)) {
    ware.use(config.plugins)
  }

  const distinctApps = new Set(apps)
  const project = readSrc(src, ...distinctApps)
  return await ware.run(project, config)
}
