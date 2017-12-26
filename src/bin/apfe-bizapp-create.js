#!/usr/bin/env node

import { Command } from 'commander'
import { remoteDoc, remoteGit } from '../lib/defaults'
import { join } from 'path'
import { error } from '../lib/logger'
import { generateBizApp } from '../lib/generate'
import { confirm, normalizeTemplate } from '../lib/util'
import { existsSync as exists } from 'fs'
import {
  chalk,
} from 'xutil'

const program = new Command('apfe bizapp create')

/**
 * Help.
 */

program.on('--help', function () {
  console.log(`
  Examples:

    ${chalk.gray('# create a top-up bizapp')}
    $ apfe bizapp create top-up

    ${chalk.gray('# For biz-apps architecture reference please check this doc:')}
    ${remoteDoc}/project-structure/biz-apps-arch.html
  `)
})

/**
 * Usage.
 */
program
  .usage('[YOUR-BIZ-APP-NAME]')
  .option('-t, --template [value]', 'using a template for creating the biz-app')
  .parse(process.argv)

const args = program.args
if (args.length !== 1) {
  program.help()
} else {
  run().catch(error)
}

/**
 * 1. get config from option
 * 2. if not exist, then get from default
 * 3. if not exist, then compose all the biz-apps using default options
 * @returns {Promise.<*>}
 */
async function run () {
  const cwd = process.cwd()
  const name = program.args[0]
  // eslint-disable-next-line
  if (!/^[^\\/?%*:|"<>\.]+$/.test(name)) {
    throw new Error(`${name} isn't a valid biz-app name, it suggested to be like topup, mobilecharge, cashier, etc.`)
  }
  const source = program.template || remoteGit
  const template = await normalizeTemplate(source)
  const dest = join(cwd, `/src/biz-apps/${name}`)
  const next = () => generateBizApp(name, `${template}/biz-app-template`, dest).catch(error)
  confirm(`Are you sure to create biz-app at ${dest}`, () => {
    if (exists(dest)) {
      confirm(`${dest} has already exist, are you sure to overwrite?`, next)
    } else {
      next()
    }
  })
}
