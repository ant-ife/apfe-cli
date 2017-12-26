#!/usr/bin/env node

import {remove} from '../lib/sim'
import { Command } from 'commander'

const program = new Command('apfe sim remove')

program
  .usage(' ')
  .parse(process.argv)

remove()
