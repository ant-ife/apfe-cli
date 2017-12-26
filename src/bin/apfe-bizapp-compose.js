#!/usr/bin/env node

import { Command } from 'commander'
import { remoteDoc } from '../lib/defaults'
import { composeApps, defaultOptions } from '../lib/compose-apps/index'
import { resolve, join } from 'path'
import globby from 'globby'
import { warn, log, error } from '../lib/logger'
import { existsFile } from '../lib/compose-apps/read-src'
import checkVersion from '../lib/check-version'
import chalk from 'chalk'

const program = new Command('apfe bizapp compose')

/**
 * Help.
 */

program.on('--help', function () {
  console.log(`
    ${chalk.gray('# For biz-apps architecture reference please check this doc:')}
    ${remoteDoc}/project-structure/biz-apps-arch.html

  `)
})

/**
 * Usage.
 */
program
  .option('-c, --config path/to/config.js', 'default is {pwd}/build/config/compose-biz-apps.js')
  .parse(process.argv)

run().catch(error)

/**
 * 1. get config from option
 * 2. if not exist, then get from default
 * 3. if not exist, then compose all the biz-apps using default options
 * @returns {Promise.<*>}
 */
async function run () {
  try {
    await checkVersion()
  } catch (err) {
  }

  validCwd()

  let config = {}
  if (program.config) {
    config = resolve(program.config)
    if (!existsFile(config)) {
      error(`config file ${config} is not exist, compose failed.`)
      return program.help()
    }
    config = require(config)
  }

  const cwd = process.cwd()
  if (!Object.keys(config).length) {
    const DEFAULT_CONFIG_PATH = 'build/config/compose-biz-apps.js'
    config = await globby(DEFAULT_CONFIG_PATH)
    if (config && config.length) {
      config = config[0]
      config = require(join(cwd, config))
    } else {
      warn(`${DEFAULT_CONFIG_PATH} is not exist, default will compose all biz-apps under src`)
    }
  }

  let options = config.options || {}
  let bizapps = config['biz-apps'] || []

  if (!bizapps.length) {
    bizapps = await globby('*', { cwd: join(cwd, 'src/biz-apps/') })
  }

  log(`composing biz-apps: ${bizapps.join(', ')}`)
  options = { ...defaultOptions, ...options }
  await composeApps(resolve(cwd, './src'), options, ...bizapps)
}

function validCwd () {
  const cwd = process.cwd()
  const validationPaths = [
    'build/config/index.js',
    'src/router/index.js',
    'src/store/index.js',
  ]

  for (const file of validationPaths) {
    const jf = join(cwd, file)
    if (!existsFile(jf)) {
      error("It's not a valid A+ project, composing failed...")
      return program.help()
    }
  }
}
