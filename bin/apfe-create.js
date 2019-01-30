#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');
const { existsSync: exists } = require('fs');
const path = require('path');
const home = require('user-home');
const inquirer = require('inquirer');

let rawDirectory;

/**
 * Usage
 */
program
  .arguments('<project-directory>')
  .action(function (directory) {
    rawDirectory = directory;
  })
  .option(
    '-r, --registry <registry-url>',
    'custom npm registry used to fetch internal templates'
  ).usage(`
  $ apfe create <project-directory> [options]`);

/**
 * Help
 */
program.on('--help', function () {
  console.log(`
Examples:
  ${chalk.green('# create a new project with public templates')}
  $ apfe create my-app
  ${chalk.green('# create a new project in parent directory')}
  $ apfe create ../my-app
  ${chalk.green('# create a new project with internal templates')}
  $ apfe create my-app --registry npm.my-registry.com
  `);
});

/**
 * Parse
 */
program.parse(process.argv);

/**
 * Validation
 */
if (typeof rawDirectory === 'undefined') {
  console.log(chalk.red('Please specify a project directory.'));
  program.outputHelp();
  process.exit(1);
}

/**
 * Settings.
 */
const registry = program.registry;

console.log('registry');
console.log(registry);
console.log('rawDirectory');
console.log(rawDirectory);

// resolve home dir
rawDirectory = rawDirectory.replace(/^~/, home);

const to = path.resolve(rawDirectory);
const name = path.basename(rawDirectory);

console.log('name');
console.log(name);

/**
 * Padding.
 */
process.on('exit', function () {
  console.log();
});

if (exists(to)) {
  inquirer
    .prompt([
      {
        type: 'confirm',
        message: 'Target directory exists. Continue?',
        name: 'ok',
      },
    ])
    .then(answers => {
      answers.ok && run();
    });
} else {
  run();
}

/**
 * Check, download and generate the project.
 */
async function run () {
  console.log('Generating');
}
