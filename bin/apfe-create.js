#!/usr/bin/env node

const chalk = require('chalk');
const { Command } = require('commander');
const { existsSync: exists } = require('fs');
const path = require('path');
const home = require('user-home');
const inquirer = require('inquirer');
const { fatal, success } = require('../lib/logger');
const { generate } = require('../lib/generate');
const checkVersion = require('../lib/check-version');
const { isLocalPath } = require('../lib/local-path');
const { remoteGit } = require('../lib/defaults');
const { normalizeTemplate } = require('../lib/util');

const program = new Command('apfe create');

/**
 * Help.
 */

program.on('--help', function () {
  console.log(`
  Examples:

    ${chalk.gray('# create a new project with an default template')}
    $ apfe create path/to/my-project

    ${chalk.gray('# create a new project with an local path template')}
    $ apfe create path/to/local-template path/to/my-project

    ${chalk.gray('# create a new project straight from a git template')}
    $ apfe create ${remoteGit} path/to/my-project
  `);
});

/**
 * Usage.
 */
program
  .usage('<local-or-git-template> [project-name]')
  .parse(process.argv);

/**
 * Help.
 */
function help () {
  program.parse(process.argv);
  if (program.args.length < 1) return program.help();
}
help();

/**
 * Settings.
 */

const args = program.args;
let git = remoteGit;
let rawName = args[0];
if (args.length > 1) {
  git = args[0];
  rawName = args[1];
}

// resolve home dir
rawName = rawName.replace(/^~/, home);

const inPlace = !rawName || rawName === '.';
const to = path.resolve(rawName || '.');
const name = (function () {
  const m = inPlace ? path.relative('../', process.cwd()) : rawName;
  return path.basename(m);
}());

/**
 * Padding.
 */

console.log();
process.on('exit', function () {
  console.log();
});

if (exists(to)) {
  inquirer.prompt([
    {
      type: 'confirm',
      message: inPlace
        ? 'Generate project in current directory?'
        : 'Target directory exists. Continue?',
      name: 'ok',
    },
  ]).then(answers => {
    answers.ok && run();
  });
} else {
  run();
}

/**
 * Check, download and generate the project.
 */
async function run () {
  const template = await normalizeTemplate(git);
  const cb = function () {
    generate(name, template, to, function (err) {
      if (err) fatal(err);
      console.log();
      success('Generated "%s".', name);
    });
  };
  if (isLocalPath(template)) {
    cb();
  } else {
    checkVersion().then(cb);
  }
}
