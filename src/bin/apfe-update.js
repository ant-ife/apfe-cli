#!/usr/bin/env node

import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import { gitDiff } from '../lib/git-diff'
import { remoteGit} from '../lib/defaults'
import { normalizeTemplate, cloneGit} from '../lib/util'
import { fatal } from '../lib/logger'
import checkVersion from '../lib/check-version'
import { getMetadataKeys } from '../lib/options'

let args
let metaDataKeysStr = 'lint, babel, webpack, flow'

const program = new Command('apfe update')

/**
 * Help.
 */
program.on('--help', function () {
  console.log(`

  Available Settings:

    ${chalk.green(metaDataKeysStr)}


  Examples:

    ${chalk.gray('# update flow from default remote template')}
    $ apfe update flow

    ${chalk.gray('# update babel and webpack from local template')}
    $ apfe update babel webpack -t path/to/local-template/

    ${chalk.gray('# update eslint and stylelint from remote git')}
    $ apfe update lint -t ${remoteGit}
  `)
})

/**
 * Usage.
 */
program
  .usage('[settings]')
  .option('-t, --template [value]', 'specify your template')
  .parse(process.argv)


/**
 * Help.
 */
function help () {
  program.parse(process.argv)
  args = program.args
  if (args.length < 1) {
    return apfeUpdateDefaultHandle()
  } else {
    inquirer.prompt([{
      type: 'confirm',
      message: `confirm to update ${args.join(', ')}`,
      name: 'ok',
    }], function (answers) {
      if (answers.ok) {
        run()
      }
    })
  }
}


/**
 * Check, download and generate the project.
 */
async function run () {
  try {
    await checkVersion()
  } catch (err) {}
  try {
    const template = await normalizeTemplate(program.template || remoteGit)
    await gitDiff(template, args, true)
  } catch (err) {
    fatal(err.message)
  }
}

/**
 * apfe update 处理逻辑
 */
const apfeUpdateDefaultHandle = function () {
  const metadataKey = cloneGit(program.template || remoteGit)
    .then(function (res) {
      metaDataKeysStr = getMetadataKeys(res, 'settings')
    })

  const timeout = new Promise(function (resolve, reject) {
    setTimeout(function () {
      reject('get remote git repo timeout')
    }, 5000)
  })

  Promise.race([metadataKey, timeout])
    .then(function () {
      program.help()
    })
    .catch(function () {
      program.help()
    })
}

help()
