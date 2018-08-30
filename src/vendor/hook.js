const path = require('path')
const ROOT_PATH = process.cwd()
const DIST_PATH = path.join(ROOT_PATH, 'dist')
const config = require(path.join(ROOT_PATH, 'build/config'))

/**
 * Run before pack, doing the stuff synchronized
 * @param utils { fse, globby }
 * fse: fs-extra https://github.com/jprichardson/node-fs-extra
 * globby: https://github.com/sindresorhus/globby
 */
exports.beforePack = function (utils) {
  const fse = utils.fse

  if (DIST_PATH === path.join(config.build.assetsRoot)) {
    return
  }

  try {
    fse.emptyDirSync(DIST_PATH)
  } catch (err) {
    console.log('failed to empty resoure files')
  }

  try {
    fse.copySync(path.join(config.build.assetsRoot), DIST_PATH)
    fse.copySync(config.build.index, path.join(DIST_PATH, 'index.html'))
  } catch (err) {
    console.log('failed to copy resoure files')
  }
}

/**
 * Run after pack, doing the stuff synchronized
 * @param utils { fse, globby }
 * fse: fs-extra https://github.com/jprichardson/node-fs-extra
 * globby: https://github.com/sindresorhus/globby
 */
exports.afterPack = function (utils) {
  ['public', 'view', '_temp'].forEach(p => utils.fse.removeSync(path.join(ROOT_PATH, p)))
}
