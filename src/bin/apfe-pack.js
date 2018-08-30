#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command('apfe pack')

program
  .usage('<command> [options]')
  .command('setkey <path-to-private-key.pem>', 'set the privtekey to sign the offline package')
  .command('genkey', 'generate the RSA key pairs')
  .command('exportkey', 'export the RSA key pairs')
  .command('pack', 'pack offline package', { isDefault: true })
  .parse(process.argv)
