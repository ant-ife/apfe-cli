import {
  babelTransform,
  duplicateImportPlugin,
  babelAppsFactory,
} from '../utils'
import { composePlugin } from '../plugin-factory'

// 1. change the container app's store/index.js methods, add the multiple sources
/*
FROM:
import Vue from 'vue'
import Vuex from 'vuex'
import wallet from './modules/wallet'
import lastSecurityContext from './modules/lastSecurityContext'
import getPaymentGuide from './modules/getPaymentGuide'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    checkout,
    lastSecurityContext,
    getPaymentGuide,
  },
})

TO:
import Vue from 'vue'
import Vuex from 'vuex'
import autoDebit from 'biz-apps/autodebit/store'
import checkout from 'biz-apps/cashier/store'
import wallet from './modules/wallet'
import lastSecurityContext from './modules/lastSecurityContext'
import getPaymentGuide from './modules/getPaymentGuide'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    autoDebit,
    wallet,
    checkout,
    lastSecurityContext,
    getPaymentGuide,
  },
})

SUPPORT OPERATIONS:
ADD
REMOVE
UPDATE
*/

export default composePlugin(
  'store',
  'store/index.js',
  async (scripts, project, config) => {
    await babelTransform(scripts[0], { plugins: storePlugins(project, config) })
  }
)

// 1. check import variable name
// 2. check routes callee
function storePlugins (project, config) {
  const { bizapps } = project
  const ctx = {
    apps: bizapps.map(babelAppsFactory(config.vuexStoreModulesNames)),
    unusedImportVars: new Set(),
  }

  // insert the variable in the `new Vuex.store({})` function
  const vuexInsertPlugin = function (ctx) {
    const { apps, unusedImportVars } = ctx
    return function ({ types: t }) {
      return {
        visitor: {
          NewExpression (path) {
            const { node } = path
            if (node.callee.type === 'MemberExpression') {
              const memberExpression = node.callee
              if (memberExpression.object.name === 'Vuex' &&
                memberExpression.property.name === 'Store') {
                const objectExpression = node.arguments[0]
                const properties = objectExpression.properties
                if (properties.length) {
                  let moduleProperty = properties
                    .filter(p => p.key.name === 'modules')
                  if (moduleProperty.length) moduleProperty = moduleProperty[0]

                  const valueExpression = moduleProperty.value
                  const modules = valueExpression.properties
                    .filter(arg => !unusedImportVars.has(arg.key.name))
                  const filterSet = new Set(modules.map(arg => arg.key.name))
                  const identifiers = apps
                    .filter(app => !app.called &&
                      !filterSet.has(app.variableName)
                    )
                    .map(app => t.identifier(app.variableName))
                  valueExpression.properties = modules.concat(identifiers)
                }
              }
            }
          },
        },
      }
    }
  }

  return [
    duplicateImportPlugin(ctx, config, 'store'),
    vuexInsertPlugin(ctx),
  ]
}
