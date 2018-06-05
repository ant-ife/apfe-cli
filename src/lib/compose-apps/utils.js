import * as babel from 'babel-core'
import codeFrame from 'babel-code-frame'
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'
import glob from 'glob'
import { resolve } from 'path'
import * as babylon from 'babylon'
import camelcase from 'camelcase'
import { warn } from '../logger'
import Debug from 'debug'

const debug = Debug('babel:util')

export const loggerPrefix = prefix => `***[compose ${prefix}]***`

// babel-handbook: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md
export function babelTransform (file, options) {
  return new Promise((resolve, reject) => {
    babel.transformFile(file, {
      ...options,
      babelrc: false, // Keep the file origin smell
    }, function (err, result) {
      if (err) {
        if (err.loc) {
          console.log(`${file} syntax error:`)
          console.log(codeFrame(readFileSync(file, 'utf8'), err.loc.line, err.loc.column))
        }
        reject(err)
        return
      }
      writeFileSync(file, result.code)
      try {
        beautifulFile(file)
      } catch (err) {
        warn('format file failed', err)
      }
      resolve(result)
    })
  })
}

export const getExportDefaultDeclaration = program => {
  const exp = program.body
    .filter(node => node.type === 'ExportDefaultDeclaration')
  if (exp.length === 1) {
    return exp[0]
  }
  return null
}

const getStringProperties = ObjectExpression => {
  const props = ObjectExpression.properties || []
  return props.some(node => node.key.type === 'StringLiteral')
}

// Get all the keys or values of such two expressions
/* Will Get ['index.title', 'modal.button.ok', 'modal.button.cancel']
export default Object.assign({}, autodebit, cashier, {
  'index.title': 'A-Plus Front-End Scaffold',
  'modal.button.ok': 'OK',
  'modal.button.cancel': 'Cancel',
})
 */

/* Will get ['index1', 'index2']
export default {
  'index1': 'A+前端工程模板',
  'index2': '确认',
}
 */
const getExportDefaultObject = (filePath, filter, mapper, log) => {
  const ast = parseAstWrapper(filePath)
  const exportDefaultDeclaration = getExportDefaultDeclaration(ast.program)
  if (exportDefaultDeclaration) {
    const { declaration } = exportDefaultDeclaration
    if (declaration.type === 'CallExpression' &&
      declaration.callee.type === 'MemberExpression') {
      const objectExps = declaration.arguments.filter(getStringProperties)
      if (objectExps.length) {
        return objectExps[0].properties
          .filter(filter)
          .map(mapper)
      }
    } else if (declaration.type === 'ObjectExpression') {
      return declaration.properties
        .filter(filter)
        .map(mapper)
    } else {
      log && log(filePath)
    }
  }
  return []
}

export const getExportDefaultObjectKeys = (filePath, log) => {
  return getExportDefaultObject(
    filePath,
    node => node.key.type === 'StringLiteral' || node.key.type === 'Identifier',
    node => {
      if (node.key.type === 'StringLiteral') {
        return node.key.value
      } else if (node.key.type === 'Identifier') {
        return node.key.name
      }
    },
    log
  )
}

// Get all the values of such two expressions
export const getExportDefaultObjectValues = (filePath, log) => {
  return getExportDefaultObject(
    filePath,
    node => node.value.type === 'StringLiteral',
    node => node.value.value,
    log
  )
}

export function parseAstWrapper (filePath) {
  const fileContent = readFileSync(filePath, 'utf8')
  let ast
  try {
    ast = babylon.parse(fileContent, { sourceType: 'module' })
  } catch (err) {
    if (err.loc) {
      console.log(`${filePath} syntax error:`)
      console.log(codeFrame(fileContent, err.loc.line, err.loc.column))
    }
    throw err
  }

  return ast
}

// Get all const values from export or export const syntax
// `export const AA = 'something_aa'`
// `export const BB = 'something_bb'`
// Will Get ['something_aa', 'something_bb']
export function getExportConstValues (filePath) {
  const ast = parseAstWrapper(filePath)
  const { body } = ast.program
  let res = []
  try {
    res = body
      .filter(node => {
        if (node.type !== 'ExportNamedDeclaration') return false
        const { declaration } = node
        if (!declaration ||
          declaration.type !== 'VariableDeclaration' ||
          declaration.kind !== 'const') {
          return false
        }
        const dcl = declaration.declarations && declaration.declarations[0]
        return dcl &&
          dcl.type === 'VariableDeclarator' &&
          dcl.init.type === 'StringLiteral'
      })
      .map(node => {
        const { declaration } = node
        const dcl = declaration.declarations && declaration.declarations[0]
        return dcl.init.value
      })
  } catch (err) {
    warn(`try to getExportConstValues while parsing ${filePath} failed.`)
  }

  return res
}

export function duplicateArrayChecker (container, log, ...bizapps) {
  function compareApps (app1, app2) {
    const conflictFiles = app1.array.filter(_ => app2.array.includes(_))
    if (conflictFiles.length > 0) {
      log(app1.name, app2.name, conflictFiles)
    }
  }

  function compareAnyTowApps (arrs, cb) {
    doMatch(arrs)

    function doMatch (arrs) {
      const app = arrs.shift()
      arrs.forEach(_ => cb(app, _))
      if (arrs.length > 0) {
        doMatch(arrs)
      }
    }
  }

  compareAnyTowApps([container, ...bizapps], compareApps)
}

function searchNodeModules (dir) {
  let deps = 10
  while (!(glob.sync('node_modules', { cwd: dir })).length && deps > 0) {
    dir = resolve(dir, '..')
    --deps
  }

  if (!(glob.sync('node_modules', { cwd: dir })).length) {
    throw new Error('Could not find node_modules file')
  } else {
    return dir
  }
}


export function beautifulFile (file, cwd) {
  const dftCwd = cwd || searchNodeModules(file)
  execSync(`./node_modules/.bin/eslint --fix --format ./node_modules/eslint-friendly-formatter ${file}`, { cwd: dftCwd })
}

export const babelAppsFactory = middlewareConfig => app => {
  let variableName = camelcase(app.name)
  if (middlewareConfig && middlewareConfig[app.name]) {
    variableName = middlewareConfig[app.name]
  }
  return {
    ...app,
    required: false,
    called: false,
    variableName,
  }
}

/**
 * This plugin is to import biz-app's variable or delete the unused variable
 * @param ctx
 * @param config
 * @param importPath
 * @param filename
 * @returns {Function}
 */
export function duplicateImportPlugin (ctx, config, importPath, filename) {
  const alias = config.webpackImportAlias || ''
  const { apps, unusedImportVars } = ctx
  return function ({ types: t }) {
    return {
      visitor: {
        Program (path) {
          const { node } = path
          let { body } = node

          // filter the possible variables
          const declarations = body
            .filter(node => {
              const vType = node.type === 'ImportDeclaration'
              if (!vType) return false

              if (!node ||
                !node.specifiers ||
                !node.specifiers.length) return false

              const source = node.specifiers[0]
              if (source.type !== 'ImportDefaultSpecifier') return false

              const localName = source.local && source.local.name
              if (!localName) return false

              const reg = new RegExp(`${alias}biz-apps/[A-Za-z0-9_-]+/${importPath}/?.*`)
              return reg.test(node.source.value)
            })

          for (const declaration of declarations) {
            const requirePath = declaration.source.value
            for (const app of apps) {
              const localName = declaration.specifiers[0].local.name
              const reg = new RegExp(`^${alias}biz-apps/${app.name}/${importPath}/?.*`)
              if (reg.test(requirePath)) {
                app.required = true
                app.variableName = localName
              } else {
                unusedImportVars.add(localName)
              }
            }
          }

          // delete the unused variable according to current apps
          for (const app of apps) {
            unusedImportVars.delete(app.variableName)
          }

          // filter the needed node, do not use the unusedImportVars node
          body = body.filter(exp => {
            if (exp.type === 'ImportDeclaration') {
              if (exp.specifiers && exp.specifiers.length) {
                const source = exp.specifiers[0]
                if (source.type === 'ImportDefaultSpecifier') {
                  const localName = source.local && source.local.name
                  if (unusedImportVars.has(localName)) {
                    return false
                  }
                }
              }
            }
            return true
          })

          // transform the apps into AST
          const importIdentiers = apps
            .filter(app => !app.required)
            .map(app => t.importDeclaration(
              [t.ImportDefaultSpecifier(t.Identifier(app.variableName))],
              t.stringLiteral(`${alias}biz-apps/${app.name}/${importPath}${filename ? ('/' + filename) : ''}`)
            ))

          // insert the needed imports under the lastImport node
          debug(`body is ${body}`)
          body.splice(0, 0, ...importIdentiers)

          path.node.body = body
        },
      },
    }
  }
}

// Case:1 Try to make
// `export default { origin }` into
// `export default Object.assign({}, app1, app2..., { origin })`
// Case2: Try to make
// `export default Object.assign({}, app1, { origin })` into
// `export default Object.assign({}, app1, app2..., { origin })`
export function spreadLocalePlugin (ctx) {
  return function ({ types: t }) {
    return {
      visitor: {
        ObjectExpression (path) {
          if (path.container && path.container.type === 'ExportDefaultDeclaration') {
            const { apps } = ctx
            const identifiers = apps
              .filter(app => !app.called)
              .map(app => t.identifier(app.variableName))
            path.replaceWith(
              t.callExpression(
                t.memberExpression(t.identifier('Object'), t.identifier('assign')),
                [t.objectExpression([]), ...identifiers, path.node]
              ),
            )
          }
        },

        CallExpression (path) {
          const { node } = path
          if (path.container &&
            path.container.type === 'ExportDefaultDeclaration' &&
            node.callee &&
            node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'Object' &&
            node.callee.property.name === 'assign') {
            const { apps, unusedImportVars } = ctx
            const objectArgs = node.arguments

            // TODO: here only match the pattern object.assign({}, ...apps, {origin})
            const origin = objectArgs.slice(0, 1).concat(objectArgs.slice(-1))
            const properties = objectArgs.slice(1, -1)
            const appVars = properties
              .filter(arg => {
                const isIdentifier = arg.type === 'identifier'
                if (!isIdentifier) return false
                return !unusedImportVars.has(arg.name)
              })
            const filterSet = new Set(appVars.map(arg => arg.name))
            const identifiers = apps
              .filter(app => !app.called && !filterSet.has(app.variableName))
              .map(app => t.identifier(app.variableName))

            origin.splice(1, 0, ...identifiers)
            node.arguments = origin
          }
        },
      },
    }
  }
}
