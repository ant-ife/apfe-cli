#!/usr/bin/env node

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const gulp = require('gulp');
const tar = require('gulp-tar');
const zip = require('gulp-zip');
const map = require('map-stream');
const sign = require('../lib/sign');
const home = require('user-home');
const { Command } = require('commander');
const LCL = require('last-commit-log');

const lcl = new LCL();

const ROOT_PATH = process.cwd();
const PACKAGE_DIR = './_packages';
const TEMP_DIR = './._temp';
const TEMP_PATH = path.join(ROOT_PATH, TEMP_DIR);

const program = new Command('apfe pack');
program
  .usage(' ')
  .option('-c, --config [file]', 'offline-package config')
  .parse(process.argv);

/**
 * archiving
 * archiving the offline-package
 * 1. empty ./_dist
 * 2. parse include and ignore configuration
 * 3. invoke gulp task
 *
 * @name archiving
 * @function
 * @access public
 * @param {Object} subapp package.json
 */
function archiving (subapp, cb) {
  console.log(chalk.yellow('# packing offline-package with config below...'));
  console.log(subapp); // output pkg.subapp config

  // empty dist path
  if (fs.pathExistsSync(TEMP_PATH)) {
    fs.removeSync(TEMP_PATH);
  }

  let sourceSrc = ['./dist/**/*']; // Defaults include all filse in dist dir

  // parse include files
  if (Array.isArray(subapp.includes) && subapp.includes.length > 0) {
    sourceSrc = subapp.includes;
  }

  // ignore subapp.ignores configuration
  if (Array.isArray(subapp.ignores)) {
    subapp.ignores.forEach((v) => {
      sourceSrc.push('!' + v);
    });
  }

  // define gulp tasks
  gulp.task('tar', () => {
    const _tarPath = `${TEMP_DIR}/_tar`;
    return gulp
      .src(sourceSrc.map(_ => `${_tarPath}/${_}`))
      .on('end', () => {
        if (fs.existsSync(_tarPath)) fs.removeSync(_tarPath);
      })
      .pipe(tar(subapp.id + '.tar'))
      .pipe(gulp.dest(TEMP_DIR));
  });

  gulp.task('cert', ['tar'], () => {
    const tarFiles = [];
    const scanPipe = (files) => {
      return map((file) => {
        !file.isDirectory() && files.push(file.relative);
      });
    };

    return gulp
      .src(TEMP_DIR + '/**/*')
      .on('end', () => {
        signTar(TEMP_PATH, tarFiles, () => gulpPkg({ tar: true }, subapp, cb));
      })
      .pipe(scanPipe(tarFiles));
  });

  gulp.task('dist', () => {
    let tarRootPath = '';
    if (subapp.rootPath) {
      tarRootPath = subapp.rootPath.replace('[id]', subapp.id) + '/';
      if (tarRootPath.indexOf('.') !== -1) {
        tarRootPath = tarRootPath.replace(/\./g, '_');
      }
    }

    gulp
      .src(sourceSrc)
      .on('end', () => {
        // build Manifest.xml
        createManifestFile(subapp, TEMP_PATH, true);

        setTimeout(() => gulp.start('cert'), 500);
      })
      .pipe(
        gulp.dest((file) => {
          let destDir = TEMP_DIR + '/_tar';
          if (file.base.indexOf(ROOT_PATH) > -1) {
            destDir += file.base.replace(ROOT_PATH, '');
          }
          destDir += tarRootPath;
          return destDir;
        })
      );
  });

  gulp.start('dist');
}

/**
 * entry
 * 1. preCheck config file (package.json as default) exist
 * 2. render build config
 * 3. invoke packSubapp @see packSubapp
 * @name entry
 * @function
 * @access public
 */
async function entry () {
  const configPath = program.config || 'package.json';

  if (!fs.pathExistsSync(configPath)) {
    console.log(chalk.red(`\r\nMissing ${configPath}`));
    return;
  }

  try {
    let pkg = {};
    const mod = require(configPath);
    if (typeof mod === 'function') {
      pkg = await mod();
    } else {
      pkg = Object.assign({}, mod);
    }
    const version = pkg.version;
    const config = Object.assign({ version }, pkg.subapp);

    if (!('subapp' in pkg)) {
      console.log(chalk.red(`\r\nMissing \`subapp\` config in ${configPath}`));
      return;
    }

    if (!config.id) {
      console.log(chalk.red(`\r\nMissing \`subapp.id\` config in ${configPath}`));
      return;
    }

    packSubapp(config);
  } catch (e) {
    console.error(e);
    console.log(chalk.red('Pack offline-package failed.'));
  }
}

/**
 * packSubapp
 *
 * 1. load hook
 * 2. execute pack
 * @name packSubapp
 * @function
 * @access public
 * @param {Object} config pack config
 */
function packSubapp (config) {
  (async () => {
    try {
      // execute pack
      await new Promise(res => {
        archiving(config, res);
      });
    } catch (ex) {
      console.error(ex);
    }
  })();
}

/**
 * createManifestFile
 * generate Manifest.xml
 *
 * @name createManifestFile
 * @function
 * @access public
 * @param {Object} subapp package.json config
 * @param {String} manifestDir output path
 */
function createManifestFile (subapp, manifestDir) {
  try {
    const out = [];
    out.push('<?xml version="1.0" encoding="utf-8"?>');
    out.push('<package>');
    out.push('  <uid>' + subapp.id + '</uid>');
    out.push('  <name>' + subapp.id + '</name>');
    out.push('  <version>' + subapp.version + '</version>');
    out.push('</package>');
    const outStr = out.join('\n');
    fs.outputFileSync(manifestDir + '/Manifest.xml', outStr);
  } catch (e) {
    console.error(chalk.red('# write Manifest.xml error:'));
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
  const CERT_JSON = {};
  const queue = files.slice(0);
  let working = 0;
  const threads = 2;
  next();

  function next () {
    const fileDir = queue.shift();
    if (!fileDir) {
      if (working <= 0) {
        fs.writeJSON(TEMP_DIR + '/CERT.json', CERT_JSON);
        cb && cb();
      }
      return;
    }
    const filePath = path.join(distPath, fileDir);

    sign.doSign(filePath, (res) => {
      CERT_JSON[fileDir] = res;
      working -= 1;
      next();
    });

    if (++working < threads) {
      next();
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
 * @param {Object} subapp package.json
 * @param {Function} cb callback
 */
function gulpPkg (options, subapp, cb) {
  const handlePack = shortHash => {
    let amrFilename = `${subapp.id}_${subapp.version}`;

    // Custom offline-package filename
    if (subapp.filename) {
      amrFilename = subapp.filename
        .replace('[id]', subapp.id)
        .replace('[version]', subapp.version)
        .replace('[random]', shortHash || Math.random().toString(36).substr(2, 7));
    }

    amrFilename += '.amr';

    const amrPath = path.join(ROOT_PATH, PACKAGE_DIR, amrFilename);
    const srcPath = TEMP_DIR + '/**/*';

    gulp.task('zip', () => {
      return gulp
        .src(srcPath)
        .pipe(zip(amrFilename))
        .pipe(gulp.dest(PACKAGE_DIR));
    });
    gulp.task('pack', ['zip'], () => {
      console.log(chalk.yellow('# packed successfully at'), chalk.green(amrPath.replace(home, '~')));
      const pkgInfo = {
        file: PACKAGE_DIR + '/' + amrFilename,
        config: subapp,
      };
      cb && cb(options.all, pkgInfo);
    });
    gulp.start('pack');
  };

  lcl.getLastCommit()
    .then(lastCommit => handlePack(lastCommit.shortHash))
    .catch(() => handlePack());
}

function preCheck () {
  if (!fs.existsSync(path.join(home, '.apfe/rsa-key/private.pem'))) {
    console.log(`
      Run the 'apfe pack setkey /path/to/private.pem'.

      If not having the private-key.

      Run the 'apfe pack genkey'.
    `);
    return;
  }
  entry();
}

preCheck();
