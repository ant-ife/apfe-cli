#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');
const { existsSync: exists } = require('fs');
const path = require('path');
const home = require('user-home');
const inquirer = require('inquirer');
const sao = require('sao');

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
  console.log(chalk.red('Please specify a directory for the new project.'));
  program.outputHelp();
  process.exit(1);
}

/**
 * Settings.
 */
const registry = program.registry;

// resolve home dir
rawDirectory = rawDirectory.replace(/^~/, home);

const to = path.resolve(rawDirectory);

/**
 * Padding
 */
process.on('exit', function () {
  console.log();
});

if (exists(to)) {
  console.log(
    chalk.red(
      `Directory "${to}" already exists.
Please remove it manually or enter another directory.`
    )
  );
  process.exit(1);
}

/**
 * Public templates
 */
const templates = [
  {
    name: 'vue.js',
    type: 'github',
    // https://saojs.org/guide/getting-started.html#using-generators
    source: 'ant-ife/create-h5-app',
  },
];

/**
 * Custom registry and internal templates
 */
if (registry) {
  console.log(chalk.red('Custom registry is not supported yet.'));
  process.exit(1);
}

/**
 * Questions
 */
const questions = [];
questions.push({
  type: 'list',
  name: 'template',
  message: 'Please select the template',
  choices: templates.map(template => ({
    name: template.name,
    value: template,
    short: template.name,
  })),
});

/**
 * Prompt and Generate
 */
async function run () {
  const { template } = await inquirer.prompt(questions);
  console.log(
    `Generating project at ${to}, using template ${chalk.blue(template.name)}`
  );
  const options = {
    generator: template.source,
    outDir: to,
  };
  const app = sao(options);
  await app.run();
}

run();
