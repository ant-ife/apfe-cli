#!/usr/bin/env node

import { Command } from 'commander'

const program = new Command('apfe bizapp')

program
  .usage('<command> [options]')
  .command('compose', 'compose the biz-apps')
  .command('create [app-name]', 'create a new biz-app')
  .parse(process.argv)
