#!/usr/bin/env node

import checkUpdate from '../lib/check-version'
import spawn from 'win-spawn'
import path from 'path'
import chalk from 'chalk'
import _ from 'xutil'

const packageCommands = {
  init: 'generate a new project step-by-step, or by a template',
  update: 'update project\'s basic-settings, includes babel, eslint, webpack, etc.',
  pack: 'pack the web app for offline use',
  sim: 'debug web app in iOS simulator',
  bizapp: 'bizapp operations, includes create and compose',
}

if (Math.random() < 0.2) {
  checkUpdate()
    .then(exec)
    .catch(exec)
} else {
  exec()
}

function exec () {
  const program = require('commander')

  program
    .version(require('../../package').version, '-v, --version')
    .usage('<command> [options]')
    .command('init', packageCommands.init)
    .command('update', packageCommands.update)
    .command('pack', packageCommands.pack)
    .command('sim', packageCommands.sim)
    .command('bizapp', packageCommands.bizapp)
    .parse(process.argv)

  const subcmd = program.args[0]
  if (!subcmd) {
    return program.help()
  }

  if (subcmd === 'help') {
    const helpcmd = program.args[1]
    if (!helpcmd) {
      return program.help()
    }

    const bin = executable(helpcmd)
    if (bin) {
      spawn(bin, ['--help'], {
        stdio: 'inherit',
        customFds: [0, 1, 2]
      })
    }
  } else {
    const bin = executable(subcmd)
    if (bin) {
      spawn(bin, process.argv.slice(3), {
        stdio: 'inherit',
        customFds: [0, 1, 2]
      })
    }
  }
}

function executable (subcmd) {
  // find executable
  const bin = 'apfe-' + subcmd + '.js'

  const local = path.join(__dirname, bin)

  if (_.isExistedFile(local)) {
    return
  }

  let commands = Object.keys(packageCommands)

  function printSimilar () {
    // guess commands
    commands = getSimilarCommands(subcmd, commands)
    console.log(`\n  Can't find command (or target): ${chalk.red(subcmd)}`)
    if (commands.length) {
      console.log('\n  It may be a mistake of the similar commands:\n')
      commands.forEach(function (cmd) {
        console.log(`    $ apfe ${chalk.green(cmd)}`)
      })
    }
  }

  try {
    printSimilar()
  } catch (e) {
    console.error(e)
  }
  return null
}

function getLevenshteinSteps (s, t) {
  const n = s.length
  const m = t.length

  if (n === 0) return m
  if (m === 0) return n

  const d = []
  let i
  let j

  for (i = 0; i <= n; i++) {
    d[i] = []
    d[i][0] = i
  }

  for (j = 0; j <= m; j++) {
    d[0][j] = j
  }

  for (i = 1; i <= n; i++) {
    for (j = 1; j <= m; j++) {
      const cost = s[i] === t[j] ? 0 : 1

      d[i][j] = Math.min(
        d[i - 1][j] + 1, // a deletion
        d[i][j - 1] + 1, // an insertion
        d[i - 1][j - 1] + cost // a substitution
      )
    }
  }

  return d[n][m]
}

function getSimilarCommands (cmd, commands) {
  const _cache = {}
  const getPoint = function (s, t) {
    if (_cache[s + t]) {
      return _cache[s + t]
    }
    const min = Math.min(s.length, t.length)
    const max = Math.max(s.length, t.length)
    if (max >= 3 * min) return 0
    const similar = 1 - getLevenshteinSteps(s, t) / max
    _cache[s + t] = similar
    return similar
  }

  commands = commands.filter(function (key) {
    return getPoint(cmd, key) > 0.3
  })

  return commands.sort(function (a, b) {
    return getPoint(cmd, b) - getPoint(cmd, a)
  })
}
