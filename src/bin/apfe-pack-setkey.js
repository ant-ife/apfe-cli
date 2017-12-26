#!/usr/bin/env node

import { Command } from 'commander'
import home from 'user-home'
import path from 'path'
import fs from 'fs-extra'
import {confirm} from '../lib/util'
import {success, error} from '../lib/logger'

const program = new Command('apfe pack setkey')

program
  .usage('<path-to-private-key.pem>')
  .parse(process.argv)

const privateKeyPath = program.args[0]
const targetPath = path.join(home, '.apfe/rsa-key/private.pem')

entry()

function entry () {
  if (!fs.existsSync(privateKeyPath)) {
    error('Invalid private-key-path')
    return
  }

  if (fs.existsSync(targetPath)) {
    const message = 'private key already exists, replace ?'
    confirm(message, setKey)
    return
  }
  setKey()
}

function setKey () {
  fs.copySync(privateKeyPath, targetPath, {
    overwrite: true,
  })
  success('set private key success')
}
