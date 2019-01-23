#!/usr/bin/env node

const { Command } = require('commander');
const home = require('user-home');
const path = require('path');
const fs = require('fs-extra');
const {success, error} = require('../lib/logger');

const program = new Command('apfe pack exportkey');
program
  .option('-o, --output-dir [value]', 'RSA key pair out put directory, default is ~/Desktop/apfe-rsa-key-pair')
  .parse(process.argv);

const DEFAULT_PATH = path.join(home, 'Desktop/apfe-rsa-key-pair');
const FIEL_LIST = ['private.pem', 'public.pem'];
const targetPath = program.outputDir || DEFAULT_PATH;
const srcPath = path.join(home, '.apfe/rsa-key');

entry();


function entry () {
  if (checkDirContainsFile(srcPath, FIEL_LIST).length) {
    error('export rsa keypairs failed');
    return;
  }
  exportKey();
}

function checkDirContainsFile (dir, fileList) {
  const filesNotExist = fileList
    .map(f => path.join(dir, f))
    .filter(f => {
      if (!fs.pathExistsSync(f)) {
        error(`${f} not exists`);
        return true;
      }
    });
  return filesNotExist;
}

function exportKey () {
  FIEL_LIST
    .forEach(f => {
      const target = path.join(targetPath, f);
      const src = path.join(srcPath, f);
      fs.copySync(src, target, {
        overwrite: true,
      });
    });

  success(`epxort rsa keypairs success, path:${targetPath}`);
}
