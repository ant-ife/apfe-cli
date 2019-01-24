#!/usr/bin/env node

const checkSelfVersion = require('../lib/check-version');
const spawn = require('win-spawn');
const path = require('path');
const chalk = require('chalk');
const { existsFile } = require('../lib/exists');

const _commands = {
  create: 'create a new project',
  update: 'update configs (babel, eslint, webpack...)',
  pack: 'pack offline package',
  sim: 'debug in iOS simulator',
};

if (Math.random() < 0.2) {
  checkSelfVersion().then(exec).catch(exec);
} else {
  exec();
}

function exec () {
  const program = require('commander');

  program
    .version(require('../package').version, '-v, --version')
    .usage('<command> [options]')
    .command('create', _commands.create)
    .command('update', _commands.update)
    .command('pack', _commands.pack)
    .command('sim', _commands.sim)
    .parse(process.argv);

  const subcmd = program.args[0];
  if (!subcmd) {
    return program.help();
  }

  if (subcmd === 'help') {
    const helpcmd = program.args[1];
    if (!helpcmd) {
      return program.help();
    }

    const bin = executable(helpcmd);
    if (bin) {
      spawn(bin, ['--help'], {
        stdio: 'inherit',
        customFds: [0, 1, 2],
      });
    }
  } else {
    const bin = executable(subcmd);
    if (bin) {
      spawn(bin, process.argv.slice(3), {
        stdio: 'inherit',
        customFds: [0, 1, 2],
      });
    }
  }
}

function executable (subcmd) {
  // find executable
  const bin = 'apfe-' + subcmd + '.js';

  const local = path.join(__dirname, bin);

  if (existsFile(local)) {
    return;
  }

  let commands = Object.keys(_commands);

  function printSimilar () {
    // guess commands
    commands = getSimilarCommands(subcmd, commands);
    console.log(`\n  Can't find command (or target): ${chalk.red(subcmd)}`);
    if (commands.length) {
      console.log('\n  It may be a mistake of the similar commands:\n');
      commands.forEach(function (cmd) {
        console.log(`    $ apfe ${chalk.green(cmd)}`);
      });
    }
  }

  try {
    printSimilar();
  } catch (e) {
    console.error(e);
  }
  return null;
}

function getLevenshteinSteps (s, t) {
  const n = s.length;
  const m = t.length;

  if (n === 0) return m;
  if (m === 0) return n;

  const d = [];
  let i;
  let j;

  for (i = 0; i <= n; i++) {
    d[i] = [];
    d[i][0] = i;
  }

  for (j = 0; j <= m; j++) {
    d[0][j] = j;
  }

  for (i = 1; i <= n; i++) {
    for (j = 1; j <= m; j++) {
      const cost = s[i] === t[j] ? 0 : 1;

      d[i][j] = Math.min(
        d[i - 1][j] + 1, // a deletion
        d[i][j - 1] + 1, // an insertion
        d[i - 1][j - 1] + cost // a substitution
      );
    }
  }

  return d[n][m];
}

function getSimilarCommands (cmd, commands) {
  const _cache = {};
  const getPoint = function (s, t) {
    if (_cache[s + t]) {
      return _cache[s + t];
    }
    const min = Math.min(s.length, t.length);
    const max = Math.max(s.length, t.length);
    if (max >= 3 * min) return 0;
    const similar = 1 - getLevenshteinSteps(s, t) / max;
    _cache[s + t] = similar;
    return similar;
  };

  commands = commands.filter(function (key) {
    return getPoint(cmd, key) > 0.3;
  });

  return commands.sort(function (a, b) {
    return getPoint(cmd, b) - getPoint(cmd, a);
  });
}
