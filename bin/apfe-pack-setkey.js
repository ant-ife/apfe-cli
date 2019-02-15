#!/usr/bin/env node

const { Command } = require('commander');
const home = require('user-home');
const path = require('path');
const fs = require('fs-extra');
const { confirm } = require('../lib/util');
const { success, error } = require('../lib/logger');

const program = new Command('apfe pack setkey');

program
  .usage('<path-to-private-key.pem>')
  .parse(process.argv);

const privateKeyPath = program.args[0];
const targetPath = path.join(home, '.apfe/rsa-key/private.pem');

entry();

function entry () {
  if (!fs.existsSync(privateKeyPath)) {
    error('Invalid private-key-path');
    return;
  }

  if (fs.existsSync(targetPath)) {
    const message = 'private key already exists, replace ?';
    confirm(message, setKey);
    return;
  }
  setKey();
}

function setKey () {
  fs.copySync(privateKeyPath, targetPath, {
    overwrite: true,
  });
  success('set private key success');
}
