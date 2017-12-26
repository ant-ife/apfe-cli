import glob from 'glob'
import { warn, success } from '../../logger'
import {
  babelTransform,
  duplicateImportPlugin,
  babelAppsFactory,
  duplicateArrayChecker,
  getExportDefaultObjectKeys,
  spreadLocalePlugin,
} from '../utils'
import { basename } from 'path'
import chalk from 'chalk'
import { composePlugin } from '../plugin-factory'

// 1. change the container app's i18n/locale/*.js files, add and use the biz-apps i18n/locale/*.js
/*
FROM: i18n/locale/en_US.js
export default {
  'index.title': 'A-Plus Front-End Scaffold',
  'modal.button.ok': 'OK',
  'modal.button.cancel': 'Cancel',
  'error.system': 'System error',
  'common.success': 'Success',
  'common.failed': 'Failed',

  // Common Keywords
  'keyword.accountName': 'Account Name',
  'keyword.vaExpireDate': 'Valid Until',
  'keyword.register': 'Register',
  'keyword.login': 'Login',
  'keyword.refresh': 'Refresh',
  'keyword.change': 'Change',
  'keyword.to': 'to',
}

TO:
import autodebit from 'biz-apps/autodebit/i18n/locales/en_US'

export default Object.assign({}, autodebit, {
  'index.title': 'A-Plus Front-End Scaffold',
  'modal.button.ok': 'OK',
  'modal.button.cancel': 'Cancel',
  'error.system': 'System error',
  'common.success': 'Success',
  'common.failed': 'Failed',

  // Common Keywords
  'keyword.accountName': 'Account Name',
  'keyword.vaExpireDate': 'Valid Until',
  'keyword.register': 'Register',
  'keyword.login': 'Login',
  'keyword.refresh': 'Refresh',
  'keyword.change': 'Change',
  'keyword.to': 'to',
}

SUPPORT OPERATIONS: CRUD
*/

const IMPORT_PATH = 'i18n/locales'

export default composePlugin(
  'i18n',
  `${IMPORT_PATH}/*.js`,
  async (scripts, project, config, logPrefix) => {
    const babelTransformers = scripts.map(filePath => {
      return babelTransform(filePath, {
        plugins: i18nBabelPlugins(filePath, project, config, logPrefix),
      })
    })

    await Promise.all(babelTransformers)
  }
)

function i18nBabelPlugins (filePath, project, config, logPrefix) {
  const { bizapps, container } = project
  const filename = basename(filePath, '.js')
  const apps = bizapps
    .filter(app => {
      const matchFiles = glob.sync(
        `${app.path}/${IMPORT_PATH}/${filename}.js`,
        { cwd: container.path }
      )
      if (matchFiles.length !== 1) {
        warn(`Could not find ${app.path}/${IMPORT_PATH}/${filename}.js, skip to next one`)
      }
      return matchFiles.length === 1
    })
    .map(babelAppsFactory(config.i18n))


  success(`${logPrefix} starting check ${IMPORT_PATH}/${filename}.js duplicate keys...`)
  const notValidExportLogger = filePath => warn(`${logPrefix} ${filePath} export not a valid object, expect Object or Object.assign() Object`)
  const containerApp = {
    name: `src/${IMPORT_PATH}/${filename}.js`,
    array: getExportDefaultObjectKeys(filePath, notValidExportLogger),
  }
  const duplicateCheckerApps = apps.map(app => {
    return {
      name: `${app.name}/${IMPORT_PATH}/${filename}.js`,
      array: getExportDefaultObjectKeys(
        `${app.path}/${IMPORT_PATH}/${filename}.js`,
        notValidExportLogger
      ),
    }
  })

  duplicateArrayChecker(
    containerApp,
    (container, app, obj) => warn(`${logPrefix} ${chalk.red(container)} && ${chalk.red(app)} exports encounter duplicate ${obj.length > 1 ? 'keys' : 'key'} with ${chalk.red(obj.join(', '))}`),
    ...duplicateCheckerApps,
  )
  success(`${logPrefix} stopping check ${IMPORT_PATH}/${filename}.js duplicate keys...`)

  const ctx = {
    apps,
    unusedImportVars: new Set(),
  }

  return [
    duplicateImportPlugin(ctx, config, IMPORT_PATH, filename),
    spreadLocalePlugin(ctx),
  ]
}
