import { warn, success } from '../../logger'
import {
  babelTransform,
  duplicateImportPlugin,
  babelAppsFactory,
  duplicateArrayChecker,
  getExportDefaultDeclaration,
  parseAstWrapper,
} from '../utils'
import { composePlugin } from '../plugin-factory'
import chalk from 'chalk'

// 1. change the container app's router/index.js methods, add the multiple sources
/*
FROM:
import { gettext } from 'utils/gettext'

Vue.use(Router)

const routes = [
  {
    meta: {
      aspm: '',
      bgGray: true,
    },
    name: pages.ERROR,
    path: '/error',
    component: r => require.ensure([], () => r(require('views/error')), 'error'),
  },
]

TO:
import { gettext } from 'utils/gettext'
import autoDebitRoutes from 'biz-apps/autodebit/router/index'

Vue.use(Router)

const routes = [
  {
    meta: {
      aspm: '',
      bgGray: true,
    },
    name: pages.ERROR,
    path: '/error',
    component: r => require.ensure([], () => r(require('views/error')), 'error'),
  },
].concat(autoDebitRoutes)

SUPPORT OPERATIONS: CRUD
*/

export default composePlugin(
  'router',
  'router/index.js',
  async (scripts, project, config, logPrefix) => {
    const { container, bizapps } = project
    // check duplicate export's Array<Routes>'s path
    success(`${logPrefix} starting check duplicate route path...`)
    const containerApp = {
      name: 'src/router/index.js',
      array: getContainerRoutesPathsArray(
        `${container.path}/router/index.js`,
        filePath => warn(`${logPrefix} ${filePath} doesn't init vue-router's routes with an array expression`)
      ),
    }

    duplicateArrayChecker(
      containerApp,
      (container, app, obj) => warn(`${logPrefix} ${chalk.red(container)} && ${chalk.red(app)} encounter duplicate route ${obj.length > 1 ? 'paths' : 'path'} with ${chalk.red(obj.join(', '))}`),
      ...bizapps.map(app => {
        return {
          name: app.name,
          array: getRoutesPathsArray(
            `${app.path}/router/index.js`,
            filePath => warn(`${logPrefix} ${filePath} needs to export an Array of Routes`)
          ),
        }
      })
    )
    success(`${logPrefix} stopping check duplicate route path...`)
    await babelTransform(
      scripts[0],
      { plugins: routesPlugins(project, config) }
    )
  }
)

// 1. check import variable name
// 2. check routes callee
function routesPlugins (project, config) {
  const { bizapps } = project
  const ctx = {
    apps: bizapps.map(babelAppsFactory(config.router)),
    unusedImportVars: new Set(),
  }

  const routerInitPlugin = function (ctx) {
    const { apps, unusedImportVars } = ctx
    return function ({ types: t }) {
      return {
        visitor: {
          CallExpression (path) {
            if (path.container.type === 'ObjectProperty' &&
              path.container.key.name === 'routes') {
              const args = path.node.arguments
                .filter(arg => !unusedImportVars.has(arg.name))
              const filterSet = new Set(args.map(arg => arg.name))
              const identifiers = apps
                .filter(app => !app.called && !filterSet.has(app.variableName))
                .map(app => t.identifier(app.variableName))
              path.node.arguments = args.concat(identifiers)
            }
          },

          ArrayExpression (path) {
            if (path.container.key && path.container.key.name === 'routes') {
              const identifiers = apps
                .filter(app => !app.called)
                .map(app => t.identifier(app.variableName))
              path.replaceWith(
                t.callExpression(
                  t.memberExpression(path.node, t.identifier('concat')),
                  identifiers
                ),
              )
            }
          },
        },
      }
    }
  }

  return [
    duplicateImportPlugin(ctx, config, 'router'),
    routerInitPlugin(ctx),
  ]
}

const getArrayElementsPaths = ele => {
  const properties = ele.properties.filter(p => p.key.name === 'path')[0]
  return properties.value.value
}

// Get this expression's routes.map(r => r.path)
/*
const router = new Router({
  mode: 'history',
  base: basePath,
  routes: [{
    meta: {
      aspm: '',
      bgGray: true
    },
    name: ERROR,
    path: '/error',
    component: r => require.ensure([], () => r(require('views/error')), 'error')
  }].concat(cashier, autodebit),
 */
function getContainerRoutesPathsArray (filePath, log) {
  const ast = parseAstWrapper(filePath)
  let res = []
  const variableDeclaration = ast.program.body
    .filter(node => {
      const vType = node.type === 'VariableDeclaration'
      if (!vType) return false

      const { declarations } = node
      const declaration = declarations[0]
      if (!declaration) return false

      return declaration.init.type === 'NewExpression' &&
        declaration.init.callee.name === 'Router'
    })

  try {
    if (variableDeclaration.length === 1) {
      const vDeclaration = variableDeclaration[0]
      let properties = vDeclaration.declarations[0].init.arguments[0].properties
      properties = properties.filter(p => p.key.name === 'routes')
      if (properties.length === 1) {
        const routerProp = properties[0]
        let arrayExpElements = []
        if (routerProp.value.type === 'CallExpression') {
          arrayExpElements = routerProp.value.callee.object.elements
        } else if (routerProp.value.type === 'ArrayExpression') {
          arrayExpElements = routerProp.value.elements
        }
        res = arrayExpElements.map(getArrayElementsPaths)
      }
    }
  } catch (err) {
  }

  if (!res || !res.length) {
    log && log(filePath)
  }

  return res
}

// Get this expression's export.default.map(r => r.path)
/*
export default [
  {
    meta: {
      titleKey: 'auto.debit.title',
      bgGray: true,
    },
    name: pages.AUTO_DEBIT_DETAIL,
    path: '/autodebit',
    component: r => require.ensure([], () => r(require('../views/detail')), 'autodebit')},
  {
    meta: {
      titleKey: 'auto.debit.title',
      bgGray: true,
    },
    name: pages.AUTO_DEBIT_LIST,
    path: '/autodebit/list',
    component: r => require.ensure([], () => r(require('../views/list')), 'autodebit'),
  },
 */
function getRoutesPathsArray (filePath, log) {
  let res = []
  try {
    const ast = parseAstWrapper(filePath)
    const exportDefaultDeclaration = getExportDefaultDeclaration(ast.program)
    if (exportDefaultDeclaration) {
      const { declaration } = exportDefaultDeclaration
      if (declaration.type === 'ArrayExpression') {
        res = declaration.elements.map(getArrayElementsPaths)
      }
    }
  } catch (err) {}

  if (!res || !res.length) {
    log && log(filePath)
  }

  return res
}
