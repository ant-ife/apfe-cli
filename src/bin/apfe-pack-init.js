#!/usr/bin/env node

import globby from 'globby'
import fs from 'fs-extra'
import uuid from 'uuid/v4'
import path from 'path'
import {success, error} from '../lib/logger'
import inquirer from 'inquirer'
import { Command } from 'commander'

const program = new Command('apfe pack init')
program
  .usage(' ')
  .parse(process.argv)

const CWD = process.cwd()
const BIZ_APPS_PATH = path.join(CWD, '../src/biz-apps')

let bizApps

const packerConfig = {
  name: 'cashier',
  version: '0.0.0.1',
  appId: uuid(),
  author: '',
  description: '',
  build: {
    include: [
      './**/*'
    ],
    ignore: [
      './**/*.md',
      './**/*.map',
    ]
  },
  'biz-apps': []
}

const inputMap = {
  name: 'input the offline-package name',
  author: 'input the package author',
  description: 'input the description'
}

entry()

function preCheck () {
  // 1. in offline-package folder
  if (!/offline-package$/.test(CWD)) {
    error('please execute in the offline-package folder')
    return Promise.reject()
  }

  // 2. has bizApps
  return globby(['*'], {
    cwd: BIZ_APPS_PATH
  }).then(res => {
    if (res.length) {
      bizApps = res
    } else {
      error(`failed to find the bizApps , path ${BIZ_APPS_PATH}`)
      return Promise.reject()
    }
  })
}

function _mapInputMessage (map) {
  const res = Object.keys(map)
    .map(name => ({
      name,
      type: 'input',
      message: map[name]
    }))
  return res.concat([{
    type: 'checkbox',
    message: 'select bizApps, check/uncheck with spacebar',
    name: 'biz-apps',
    choices: bizApps.map(name => ({name}))
  }])
}

function generateFile (packerConfig) {
  // 1. write packer.json
  const PACKER_PATH = path.join(CWD, packerConfig.name)
  fs.ensureDirSync(PACKER_PATH)
  fs.writeJSONSync(path.join(PACKER_PATH, 'packer.json'), packerConfig, {
    spaces: 2
  })

  // 2. copy hook.js
  fs.copySync(path.join(__dirname, '../vendor/hook.js'), path.join(PACKER_PATH, 'hook.js'))
}

async function entry () {
  try {
    await preCheck()
  } catch (e) { return }
  inquirer
    .prompt(_mapInputMessage(inputMap), (res) => {
      if (!packerConfig.name) {
        error('invalid offline-package name')
        return
      }
      Object.assign(packerConfig, res)
      generateFile(packerConfig)
      success('init offline-package success')
    })
}
