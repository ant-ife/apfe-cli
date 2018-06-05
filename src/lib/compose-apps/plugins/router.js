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
import * as R from 'ramda'

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
          MemberExpression (path) {
            const isValid = R.allPass([
              R.pathEq(['node', 'object', 'type'], 'ArrayExpression'),
              R.pathEq(['node', 'property', 'name'], 'concat'),
              x => {
                const containerArgs = R.path(['container', 'arguments'], path)
                if (!notEmptyArray(containerArgs)) {
                  return false
                }

                const properties = R.path(['node', 'object', 'elements', 0, 'properties'], x)
                if (notEmptyArray(properties)) {
                  return isValidRoutesProperties(properties)
                }

                return false
              },
            ])

            if (isValid(path)) {
              const args = R.pipe(
                R.path(['container', 'arguments']),
                R.filter(arg => !unusedImportVars.has(arg.name)),
              )(path)

              const filterSet = new Set(R.map(R.prop('name'), args))
              const identifiers = R.pipe(
                R.filter(app => !app.called && !filterSet.has(app.variableName)),
                R.map(app => t.identifier(app.variableName)),
              )(apps)

              path.container.arguments = args.concat(identifiers)
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

const getArrayElementsPaths = R.pipe(
  R.prop('properties'),
  R.find(R.pathEq(['key', 'name'], 'path')),
  R.path(['value', 'value'])
)

const isValidRoutesProperties = p => !R.isEmpty(R.intersection(
  R.map(R.path(['key', 'name']), p),
  ['meta', 'path', 'name'],
))

const isExist = R.complement(R.isNil)
const notEmptyArray = R.both(isExist, R.complement(R.isEmpty))

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
  const body = ast.program.body
  let res = []
  const firstDeclaration = R.path(['declarations', 0])
  const getRoutesElements = R.path(['init', 'callee', 'object', 'elements'])
  const isTypeDeclaration = R.propEq('type', 'VariableDeclaration')

  // two possible situations
  /* 1. within the new Route Expression
    const router = new Router({
      mode: 'history',
      base: basePath,
      routes: [...].concat(...),
    })
   */
  const finder1 = R.allPass(
    [
      isTypeDeclaration,
      R.pipe(firstDeclaration, isExist),
      R.pipe(firstDeclaration, R.allPass(
        [
          R.pathEq(['init', 'type'], 'NewExpression'),
          R.pathEq(['init', 'callee', 'name'], 'Router'),
          R.pathEq(['init', 'arguments', 0, 'type'], 'ObjectExpression'),
          firstD => {
            const properties = R.path(['init', 'arguments', 0, 'properties'], firstD)
            if (!properties || !properties.length) return false
            return R.any(p => {
              const key = R.path(['key', 'name'], p)
              const value = R.path(['value', 'type'], p)
              return key === 'routes' && value === 'CallExpression'
            }, properties)
          },
        ],
      )),
    ]
  )
  const mapper1 = R.pipe(
    R.path(['declarations', 0, 'init', 'arguments', 0, 'properties']),
    R.find(R.pathEq(['key', 'name'], 'routes')),
    R.view(R.lensPath(['value', 'callee', 'object', 'elements'])),
    R.map(getArrayElementsPaths)
  )

  /* 2. outside the new Route Expression
   const routes = [...].concat(...)
   const router = new Router(routes, ...)
  */
  const finder2 = R.allPass(
    [
      isTypeDeclaration,
      R.pipe(firstDeclaration, isExist),
      R.pipe(
        firstDeclaration,
        R.allPass(
          [
            R.pathEq(['init', 'callee', 'object', 'type'], 'ArrayExpression'),
            R.pipe(getRoutesElements, R.all(
              R.allPass(
                [
                  R.propEq('type', 'ObjectExpression'),
                  R.propSatisfies(p => {
                    if (!p.length) return false
                    return !R.isEmpty(R.intersection(
                      R.map(R.path(['key', 'name']), p),
                      ['meta', 'path', 'name']
                    ))
                  }, 'properties'),
                ]
              )
            )),
          ]
        )
      ),
    ]
  )
  const mapper2 = R.pipe(
    R.path(['declarations', 0, 'init', 'callee', 'object', 'elements']),
    R.map(getArrayElementsPaths),
  )

  const lookups = [
    R.pipe(R.find(finder2), mapper2),
    R.pipe(R.find(finder1), mapper1),
  ]

  for (let i = 0; i < lookups.length; i++) {
    const f = lookups[i]
    let r
    try {
      r = f(body)
    } catch (err) {

    }

    if (r && r.length) {
      res = r
      break
    }
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
