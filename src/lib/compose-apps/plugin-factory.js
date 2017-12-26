import globby from 'globby'
import { warn, success } from '../logger'
import {
  duplicateArrayChecker,
  loggerPrefix,
  getExportConstValues,
  getExportDefaultObjectKeys,
  getExportDefaultObjectValues,
} from './utils'
import { join, basename } from 'path'
import chalk from 'chalk'

export const duplicateChecker = getValueFunc => filePath => async (project, config, next) => {
  const filename = basename(filePath)
  const logPrefix = `***[static checking ${filename}]***`
  success(`${logPrefix} starting check ${filename} duplicate values...`)
  const { container, bizapps } = project
  const checkerObject = log => app => globby(filePath, { cwd: app.path })
    .then(res => {
      if (res.length !== 1) {
        log && log(app)
        return null
      }

      return {
        name: `${app.name}/${filePath}`,
        array: getValueFunc(join(app.path, res[0])),
      }
    })
    .catch(_ => warn(`${logPrefix} transform ${app.path} failed`))

  const containerChecker = await checkerObject(_ => warn(`${logPrefix} requires container app has the ${filePath}`))(container)
  if (!containerChecker) {
    success(`${logPrefix} stopping check ${filename}...`)
    next && await next()
    return
  }

  let bizappCheckers = await Promise.all(bizapps.map(
    checkerObject(app =>
      warn(`Could not find ${app.path}/${filePath}.js, skip to next one`))
  )
  )
  bizappCheckers = bizappCheckers.filter(Boolean)

  duplicateArrayChecker(
    containerChecker,
    (container, app, obj) => warn(`${logPrefix} ${chalk.red(container)} && ${chalk.red(app)} encounter duplicate ${obj.length > 1 ? 'values' : 'value'} with ${chalk.red(obj.join(', '))}`),
    ...bizappCheckers,
  )

  success(`${logPrefix} stopping check ${filename} duplicate values...`)
  next && await next()
}

export const duplicateExportConstValuesChecker = duplicateChecker(getExportConstValues)
export const duplicateExportConstKeysChecker = duplicateChecker(getExportDefaultObjectKeys)

export const duplicateExportDefaultObjectValuesChecker = duplicateChecker(getExportDefaultObjectValues)
/**
 *
 * @param name pluginName
 * @param globPattern globPattern for scripts to transform
 * @param transform (scripts, project, config, logPrefix)
 */
export const composePlugin = (name, globPattern, transform) => async (project, config, next) => {
  const filename = name || basename(globPattern)
  const logPrefix = loggerPrefix(filename)
  success(`${logPrefix} starting compose ${filename}...`)

  const { container } = project
  const scripts = await globby(globPattern, { cwd: container.path })
  if (!scripts.length) {
    warn(`${logPrefix} requires container app has the ${globPattern}`)
    success(`${logPrefix} stopping compose ${filename}...`)
    await next()
    return
  }

  if (transform) {
    success(`${logPrefix} starting transform ${globPattern}...`)
    await transform(
      scripts.map(s => join(container.path, s)),
      project,
      config,
      logPrefix
    )
    success(`${logPrefix} stopping transform ${globPattern}...`)
  }

  success(`${logPrefix} stopping compose ${filename}...`)
  await next()
}
