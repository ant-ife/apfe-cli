#!/usr/bin/env node

import {create} from '../lib/sim'
import { Command } from 'commander'
const program = new Command('apfe sim create')
program
  .usage(' ')
  .parse(process.argv)

create()
