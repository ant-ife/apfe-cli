#!/usr/bin/env node

import {install} from '../lib/sim'
import { Command } from 'commander'

const program = new Command('apfe sim install')

program
  .usage('<path-to-iOS.app>')
  .parse(process.argv)

install(program.args[0])
