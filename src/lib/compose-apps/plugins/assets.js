import globby from 'globby'
import { warn, success } from '../../logger'
import {
  babelTransform,
  duplicateArrayChecker,
  babelAppsFactory,
} from '../utils'
import chalk from 'chalk'
import { composePlugin } from '../plugin-factory'
import { join } from 'path'

// 1. change the container app's utils/load-icons methods, add the multiple sources, if the source exist, then not add
/*
FROM:
const allIcons = require.context('assets/icons', true, /\.(svg|png)$/)
function importAll (r) {
  r.keys().forEach(r)
}
importAll(allIcons)

TO:
const allIcons = require.context('assets/icons', true, /\.(svg|png)$/)
const all${app}Icons = require.context('${biz-apps}/assets/icons', true, /\.(svg|png)$/)
function importAll (r) {
  r.keys().forEach(r)
}
importAll(allIcons)
importAll(all${app}Icons)

SUPPORT OPERATIONS:
ADD
REMOVE
UPDATE
*/


export default composePlugin(
  'assets',
  'utils/load-icons.js',
  async (scripts, project, config, logPrefix) => {
    const { bizapps, container } = project
    const globbyIcons = name => app => {
      return globby(['*.svg', '*.png'], { cwd: join(app.path, 'assets/icons') })
        .then(array => {
          return {
            name: name || app.name,
            array,
          }
        })
    }

    const containerIcons = await globbyIcons('container')(container)
    const bizappIcons = await Promise.all(bizapps.map(globbyIcons()))

    success(`${logPrefix} starting check duplicate assets/icons/*.svg|*.png`)
    duplicateArrayChecker(
      containerIcons,
      (container, app, obj) => warn(`${logPrefix} ${chalk.red(container)} && ${chalk.red(app)} assets encounter duplicate ${obj.length > 1 ? 'files' : 'file'} with ${chalk.red(obj.join(', '))}`),
      ...bizappIcons,
    )
    success(`${logPrefix} stopping check duplicate assets/icons/*.svg|*.png`)

    await babelTransform(
      scripts[0],
      { plugins: assetsPlugin(bizapps, config) }
    )
  })


// TestCases:
// 1. get the variable by require.context({bizApp}/assets)
//    if not exist, then init it and call it.
//    if existed, check if called, if not called, then call.
// 2. if the unnecessary require.context('assets/${app}) variable exist, then remove it both in declaration and callExpression
function assetsPlugin (bizapps, config) {
  const alias = config.webpackImportAlias
  const container = {
    name: 'container',
    required: false,
    called: false,
    variableName: 'allIcons',
  }
  const apps = bizapps.map(babelAppsFactory(config.assets))

  const unusedRequireContextVarNames = new Set()

  return function ({ types: t }) {
    return {
      visitor: {
        VariableDeclaration (path) {
          const { node } = path
          if (node.declarations.length) {
            const declarator = node.declarations[0]
            const varName = declarator.id.name

            if (declarator.init &&
              declarator.init.arguments.length &&
              declarator.init.arguments[0]) {
              if (unusedRequireContextVarNames.has(varName)) {
                path.remove()
                return
              }
            }

            const idName = declarator.id.name
            if (idName === container.variableName) {
              for (const app of apps) {
                if (!app.required) {
                  path.insertAfter(
                    t.variableDeclaration(
                      'const',
                      [t.variableDeclarator(
                        t.identifier(`${app.variableName}`),
                        t.callExpression(
                          t.memberExpression(t.identifier('require'),
                            t.identifier('context')),
                          [t.stringLiteral(`${alias}biz-apps/${app.name}/assets/icons`),
                            t.booleanLiteral(true),
                            // eslint-disable-next-line
                            t.regExpLiteral('\.(svg|png)$')]))]
                    )
                  )
                }
              }
            }
          }
        },

        CallExpression (path) {
          const { node } = path
          const arg1 = node.arguments && node.arguments[0]
          if (!arg1 || !arg1.name ||
            !(node.callee && node.callee.name === 'importAll')) return

          if (arg1.name === container.variableName) {
            for (const app of apps) {
              if (!app.called) {
                path.insertAfter(
                  t.callExpression(t.identifier('importAll'),
                    [t.identifier(app.variableName)])
                )
              }
            }
          }

          if (unusedRequireContextVarNames.has(arg1.name)) {
            path.remove()
          }
        },

        Program ({ node }) {
          const { body } = node
          const declarations = body
            .filter(node => {
              const vType = node.type === 'VariableDeclaration'
              if (!vType) return false

              let declarations = node.declarations
              if (!declarations.length) return false

              declarations = declarations[0]
              if (!declarations.init) return false

              declarations = declarations.init
              if (!declarations.callee) return false

              declarations = declarations.callee
              if (!declarations.object || !declarations.property) return false

              return declarations.object.name === 'require' &&
                declarations.property.name === 'context'
            })

          for (const declaration of declarations) {
            const declarator = declaration.declarations[0]
            const varName = declarator.id.name
            const requirePath = declarator.init.arguments[0].value
            for (const app of apps) {
              const reg = new RegExp(`^${alias}biz-apps/${app.name}/assets/icons`)
              if (reg.test(requirePath)) {
                app.required = true
                app.variableName = varName
              } else if ((new RegExp(`^${alias}assets/icons`).test(requirePath))) {
                container.required = true
                container.variableName = varName
              } else {
                unusedRequireContextVarNames.add(varName)
              }
            }
          }

          // filter the real unused variable
          for (const app of apps) {
            if (unusedRequireContextVarNames.has(app.variableName)) {
              unusedRequireContextVarNames.delete(app.variableName)
            }
          }

          const expressions = body
            .filter(node => {
              const expressType = node.type === 'ExpressionStatement'
              const callType = node.expression &&
                node.expression.type === 'CallExpression'
              return expressType && callType
            })

          for (const expression of expressions) {
            const callExp = expression.expression
            const args = callExp.arguments || [{ value: void 0 }]
            for (const app of apps) {
              if (app.variableName === args[0].name) {
                app.called = true
              } else if (app.variableName === container.variableName) {
                container.called = true
              }
            }
          }
        },
      },
    }
  }
}
