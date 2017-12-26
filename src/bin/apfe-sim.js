#!/usr/bin/env node

import chalk from 'chalk'
import {
  Command,
} from 'commander'

const usageStr = `

    ${chalk.gray('# install app, create simulator immediately')}
    $ apfe sim install /path/to/ios.app

    ${chalk.gray('# create a simulator')}
    $ apfe sim create

    ${chalk.gray('# open url in simulator directly')}
    $ apfe sim start

    ${chalk.gray('# open url that contains special characters, you need to wrap it in single quotes')}
    $ apfe sim start 'http://the/url'
`

const program = new Command('apfe sim')

program
  .usage(usageStr)
  .command('create', 'create a new simulator')
  .command('install <path-to-iOS.app>', 'install the local path app')
  .command('start', 'start the installed app with a web URL in simulator')
  .command('remove', 'remove simulator')
  .parse(process.argv)
