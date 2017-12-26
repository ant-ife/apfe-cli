#!/usr/bin/env node

import {start, openUrl} from '../lib/sim'
import { Command } from 'commander'

const program = new Command('apfe sim start')
program
  .usage('<webURL>')
  .parse(process.argv)

start(_ => {
  const url = program.args[0]
  url && openUrl(url)
})
