#!/usr/bin/env node

import fs from 'fs-extra'
import chalk from 'chalk'
import path from 'path'
import gulp from 'gulp'
import tar from 'gulp-tar'
import zip from 'gulp-zip'
import map from 'map-stream'
import sign from '../lib/sign'
import home from 'user-home'
import globby from 'globby'
import {execSync} from 'child_process'
import { Command } from 'commander'
import {composeApps} from '../lib/compose-apps'

const ROOT_PATH = process.cwd()
const PACKAGE_DIR = './_package'
const DIST_DIR = './_dist'
const DIST_PATH = path.join(ROOT_PATH, DIST_DIR)
const TEMP_PATH = path.join(ROOT_PATH, '_temp')

const PROJECT_PATH = path.join(ROOT_PATH, '../../')
// const PRE_PACK_PATH = path.join(ROOT_PATH, './prepack.js')
const HOOK_PATH = path.join(ROOT_PATH, './hook.js')


const program = new Command('apfe pack')
program
  .usage(' ')
  .parse(process.argv)

/**
 * archiving
 * archiving the offline-package
 * 1. empty ./_dist
 * 2. parse packer.json include and ignore configuration
 * 3. invoke gulp task
 *
 * @name archiving
 * @function
 * @access public
 * @param {Object} packer packer.json
 */
function archiving (packer, cb) {
  console.log(chalk.yellow('# start apfe pack...'))
  // empty dist path
  if (fs.pathExistsSync(DIST_PATH)) {
    fs.removeSync(DIST_PATH)
  }

  let distSrc = []
  const files84 = []

  // parse packer include files
  if (packer.build && packer.build.include) {
    distSrc = distSrc.concat(packer.build.include)
  }

  // ignore builder files
  distSrc.push(
    '!' + PACKAGE_DIR,
    '!' + '!' + PACKAGE_DIR + '/**'
  )

  // ignore packer.ignore configuration
  if (packer.build && packer.build.ignore) {
    packer.build.ignore.forEach((v) => {
      distSrc.push('!' + v)
    })
  }

  // define gulp entry task
  gulp.task('tar', () => {
    return gulp
      .src(DIST_DIR + '/84/_tar/**/*')
      .pipe(tar(packer.name + '.tar'))
      .pipe(gulp.dest(DIST_DIR + '/84'))
  })

  gulp.task('cert84', ['tar'], () => {
    const _tarPath = DIST_PATH + '/84/_tar'
    if (fs.existsSync(_tarPath)) {
      fs.removeSync(_tarPath)
    }

    const rtv = gulp.src(DIST_DIR + '/84/**/*')
    function scanPipe (files) {
      function fn (file, cb) {
        !file.isDirectory() && files.push(file.relative)
      }
      return map(fn)
    }
    rtv.pipe(scanPipe(files84))
    rtv.on('end', () => {
      signTar(DIST_PATH + '/84', files84, () => {
        const _options = {
          tar: true
        }
        gulpPkg(_options, packer, cb)
      })
    })
    return rtv
  })

  gulp.task('dist84', () => {
    const src = gulp.src(distSrc).on('end', () => {
      // build Manifest.xml
      buildManifestSync(packer, DIST_PATH, true)

      setTimeout(() => {
        gulp.start('cert84')
      }, 500)
    })

    src.pipe(
      gulp.dest((file) => {
        let distDir = DIST_DIR + '/84/_tar'
        if (file.base.indexOf(ROOT_PATH) > -1) {
          distDir += file.base.replace(path.join(TEMP_PATH, 'dist'), '')
        }
        return distDir
      }),
    )

    fs.copySync('./packer.json', path.join(DIST_DIR + '/84/_tar/packer.json'))
  })

  gulp.start('dist84')
}

/**
 * entry
 * 1. preCheck packer.json exist
 * 2. render build config
 * 3. invoke bizAppPack @see bizAppPack
 * @name entry
 * @function
 * @access public
 */
function entry () {
  if (!fs.pathExistsSync('packer.json')) {
    console.log(chalk.red("Fail: Can't find packer.json !\r\n"))
    return
  }
  try {
    const config = fs.readJSONSync('packer.json')
    const build = config.build;

    // render inclue, ignore config
    ['include', 'ignore'].forEach(k => {
      build[k] = build[k].map(_ => path.join(TEMP_PATH, 'dist', _))
    })
    bizAppPack(config)
  } catch (e) {
    console.error(e)
    console.log(chalk.red('failed to pack .'))
  }
}

function removeTemp () {
  console.log(chalk.yellow('# removing temp folder'))
  fs.removeSync(path.join(ROOT_PATH, '_temp'))
}

/**
 * bizAppPack
 *
 * 1. copy src
 * 2. link node_modules
 * 3. compose bizapps
 * 4. build assets
 * 5. load hook
 * 6. execute pack
 * @name bizAppPack
 * @function
 * @access public
 * @param {Object} config pack config
 */
function bizAppPack (config) {
  const bizApps = config['biz-apps'];

  (async () => {
    try {
      let paths = await globby(['*', '!{node_modules,offline-package,dist,offline_package}'], {
        cwd: '../../'
      })

      console.log(chalk.yellow('# staring copy file src to _temp'))
      paths.forEach(f => {
        fs.copySync(path.join(PROJECT_PATH, f), path.join(TEMP_PATH, f))
      })

      // 2. link node_modules
      console.log(chalk.yellow('# staring link node_modules'))
      fs.ensureSymlinkSync(path.join(PROJECT_PATH, 'node_modules'), path.join(TEMP_PATH, 'node_modules'))

      // 3. compose bizapps
      console.log(chalk.yellow('# staring compose biz apps', bizApps))
      await composeApps(path.join(TEMP_PATH, './src'), {}, ...bizApps)

      // 4. build assets
      console.log(chalk.yellow('# staring building assets'))
      execSync('npm run build', {
        cwd: TEMP_PATH
      })

      // 5. loading hook
      let beforePack, afterPack
      if (fs.pathExistsSync(HOOK_PATH)) {
        const hook = require(HOOK_PATH)
        afterPack = hook.afterPack
        beforePack = hook.beforePack
      }

      console.log(chalk.yellow('# starting beforePack'))
      beforePack && beforePack({
        fse: fs,
        globby
      })

      // 6. execute pack
      await new Promise(res => {
        archiving(config, res)
      })

      console.log(chalk.yellow('# starting afterPack'))
      afterPack && afterPack({
        fse: fs,
        globby
      })
    } catch (e) {
      console.error(chalk.red('# error', e))
    }

    removeTemp()
  })()
}

/**
 * buildManifestSync
 * generate Manifest.xml
 *
 * @name buildManifestSync
 * @function
 * @access public
 * @param {Object} packer packer.json config
 * @param {String} manifestDir output path
 */
function buildManifestSync (packer, manifestDir) {
  try {
    const out = []
    out.push('<?xml version="1.0" encoding="utf-8"?>')
    out.push('<package>')
    out.push('  <name>' + packer.name + '</name>')
    out.push('  <version>' + packer.version + '</version>')
    out.push('</package>')
    const outStr = out.join('\n')
    fs.outputFileSync(manifestDir + '/84/Manifest.xml', outStr)
  } catch (e) {
    console.error(chalk.red('# write Manifest.xml error:'))
  }
}

/**
 * signTar
 * generate cert.json by invoking remote server
 * contains 2 signatures
 * 1. Manifest.xml
 * 2. tar package
 *
 * @name signTar
 * @function
 * @access public
 * @param {String} distPath dist path
 * @param {Array} files file list
 * @param {Function} cb callback
 */
function signTar (distPath, files, cb) {
  const CERT_JSON = {}
  const queue = files.slice(0)
  let working = 0
  const threads = 2
  next()

  function next () {
    const fileDir = queue.shift()
    if (!fileDir) {
      if (working <= 0) {
        fs.writeJSON(DIST_DIR + '/84/CERT.json', CERT_JSON)
        cb && cb()
      }
      return
    }
    const filePath = path.join(distPath, fileDir)

    sign.doSign(filePath, (res) => {
      CERT_JSON[fileDir] = res
      working -= 1
      next()
    })

    if (++working < threads) {
      next()
    }
  }
}

/**
 * gulpPkg
 * build the target amr type package
 * 1. zip the _dist path
 * 2. generate the *.amr in ./_package
 *
 * @name gulpPkg
 * @function
 * @access public
 * @param {Object} options options
 * @param {Object} packer packer.json
 * @param {Function} cb callback
 */
function gulpPkg (options, packer, cb) {
  let amrFilename =
    packer.name +
    '-' +
    packer.version.replace(/\./g, '_') +
    '-TAR.amr'

  const packageDir = PACKAGE_DIR + '/' + packer.version
  const amrPath = path.join(ROOT_PATH, packageDir + '/' + amrFilename)
  const srcPath = DIST_DIR + '/84/**/*'

  gulp.task('zip', () => {
    return gulp
      .src(srcPath)
      .pipe(zip(amrFilename))
      .pipe(gulp.dest(packageDir))
  })
  gulp.task('pack', ['zip'], () => {
    console.log('# packed at ' + chalk.green(amrPath))
    const pkgInfo = {
      file: packageDir + '/' + amrFilename,
      packer: packer,
    }
    cb && cb(options.all, pkgInfo)
  })
  gulp.start('pack')
}

function preCheck () {
  if (!fs.existsSync(path.join(home, '.apfe/rsa-key/private.pem'))) {
    console.log(`
      Run the 'apfe pack setkey /path/to/private.pem'.

      If not having the private-key.

      Run the 'apfe pack genkey'.
    `)
    return
  }
  entry()
}

preCheck()
