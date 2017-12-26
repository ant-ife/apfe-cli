const chai = require('chai')
const { resolve, join } = require('path')
const { tmpdir } = require('os')
const fse = require('fs-extra')
const {
  composeApps,
} = require('../../dist')

chai.use(require('chai-fs'))

const assert = chai.assert
const tmpDir = join(tmpdir(), './A-Plus-standard-project')
const source = resolve(__dirname, '../fixtures/A-Plus-standard-project')
const allApps = fse.readdirSync(join(source, './src'))

describe('apfe-bizapp-compose', function () {
  before(function () {
    fse.copySync(source, tmpDir)
  })

  it('compose biz-app all, it should change the files', function (done) {
    const ctx = this
    const apps = ['autodebit', 'cashier']
    composeApps(resolve(tmpDir, './src'), {}, ...apps)
      .then(function () {
        ctx.routerContent = assertImports('router', apps)
        ctx.storeContent = assertImports('store', apps)
        done()
      })
      .catch(done)
  })

  it('compose biz-app all again, it should not change the files', function (done) {
    const apps = ['autodebit', 'cashier']
    const ctx = this
    composeApps(resolve(tmpDir, './src'), {}, ...apps)
      .then(function () {
        assertSameContent('router', ctx.routerContent)
        assertSameContent('store', ctx.storeContent)
        done()
      })
      .catch(done)
  })

  it('compose biz-app only cashier, it should only contains the cashier logic', function (done) {
    const apps = ['cashier']
    const ctx = this
    composeApps(resolve(tmpDir, './src'), {}, ...apps)
      .then(function () {
        ctx.routerContent = assertImports('router', apps)
        ctx.storeContent = assertImports('store', apps)
        done()
      })
      .catch(done)
  })

  after(function () {
    fse.removeSync(tmpDir)
  })
})

const getImportContentReg = (importPath, app) => {
  return new RegExp(`.*import ${app} from '~biz-apps/${app}/${importPath}.*'.*`)
}

const unusedApps = apps => {
  const usedSet = new Set(apps)
  return allApps.filter(app => usedSet.has(app))
}

const assertImports = (importPath, apps) => {
  const filePath = join(tmpDir, `./src/${importPath}/index.js`)
  const assertMatch = ifMatch => app => {
    const fn = ifMatch ? assert.fileContentMatch : assert.notFileContentMatch
    return fn.call(
      null,
      filePath,
      getImportContentReg(importPath, app)
    )
  }

  apps.forEach(assertMatch(true))
  unusedApps(apps).forEach(assertMatch(false))

  return fse.readFileSync(filePath, 'utf8')
}

const assertSameContent = (importPath, origin) => {
  const filePath = join(tmpDir, `./src/${importPath}/index.js`)
  assert.fileContent(filePath, origin)
}

