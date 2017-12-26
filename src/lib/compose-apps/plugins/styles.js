import glob from 'glob'
import { warn, success } from '../../logger'
import { readFile, writeFile } from 'fs-extra'
import { composePlugin } from '../plugin-factory'

/*
// Core
@import './core/variables.less';
@import './core/mixins.less';
@import './core/normalize.less';
@import './core/scaffolding.less';
@import './core/utilities.less';
@import './core/transitions.less';

// Components
@import './components/button.less';
@import './components/digital-password.less';
@import './components/row.less';
@import './components/icon.less';
@import './components/modal.less';


TO:
// Core
@import './core/variables.less';
@import './core/mixins.less';
@import './core/normalize.less';
@import './core/scaffolding.less';
@import './core/utilities.less';
@import './core/transitions.less';

// Components
@import './components/button.less';
@import './components/digital-password.less';
@import './components/row.less';
@import './components/icon.less';
@import './components/modal.less';

// Pages
@import '../biz-apps/autodebit/styles/index.less';
@import '../biz-apps/cashier/styles/index.less';

SUPPORT OPERATIONS:
ADD
REMOVE
UPDATE
*/

// TODO: using less AST to write the plugin
export default composePlugin(
  'styles',
  'styles/index.less',
  async (scripts, project, config, logPrefix) => {
    const { container, bizapps } = project

    const apps = bizapps
      .filter(app => {
        const lessPath = `${app.path}/styles/index.less`
        const matchFiles = glob.sync(
          lessPath,
          { cwd: container.path }
        )
        if (matchFiles.length !== 1) {
          warn(`${logPrefix} Could not find ${lessPath}, skip to next one`)
        }
        return matchFiles.length === 1
      })
      .map(app => {
        return {
          module: `@import '../biz-apps/${app.name}/styles/index.less'`,
          name: app.name,
          required: false,
        }
      })

    const sourceFilePath = `${container.path}/styles/index.less`
    let fileContent = await readFile(sourceFilePath, 'utf-8')
    // eslint-disable-next-line
    let currentApps = fileContent.match(new RegExp('[^\/\/+]@import.*', 'ig'))
    if (currentApps && currentApps.length) {
      const unusedApps = new Set()
      currentApps.forEach(p => {
        const reg = new RegExp('../biz-apps/([A-Za-z0-9_-]+)/styles/index.less')
        const name = reg.exec(p)
        if (name && name.length === 2) {
          for (const app of apps) {
            if (app.name === name[1]) {
              app.required = true
            } else {
              unusedApps.add(name[1])
            }
          }
        }
      })

      for (const app of apps) {
        unusedApps.delete(app.name)
      }

      for (const unusedApp of unusedApps) {
        const importPath = `../biz-apps/${unusedApp}/styles/index.less`
        fileContent = fileContent.replace(new RegExp(`@import\\s+['"]${importPath}['"];`), '')
      }

      for (const app of apps) {
        if (!app.required) {
          fileContent = `${fileContent}\n${app.module};`
        }
      }
    }

    await writeFile(sourceFilePath, fileContent)
    success(`${logPrefix} stopping compose styles...`)
  }
)
