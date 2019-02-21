#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');
const { existsSync: exists } = require('fs');
const path = require('path');
const home = require('user-home');
const inquirer = require('inquirer');
const sao = require('sao');

let rawTemplate;
let rawPath;

/**
 * Usage
 */
program
  .arguments('<template>')
  .arguments('[path-to-project]')
  .action(function (template, path) {
    rawTemplate = template;
    if (path) {
      rawPath = path;
    } else {
      rawPath = '.';
    }
  })
  .option('-c, --npm-client <client>', 'custom npm client').usage(`
  $ apfe create <template> [path-to-project] [options]`);

/**
 * Help
 */
program.on('--help', function () {
  console.log(`
Creates new projects from create-* template.

Examples:
  ${chalk.green('# create project with h5-app template')}
  $ apfe create h5-app path/to/project

  ${chalk.green(
    '# create project with h5-app template using custom npm client'
  )}
  $ apfe create h5-app path/to/project -c mynpm

  ${chalk.green('# create project in current directory with h5-app template')}
  $ apfe create h5-app
`);
});

/**
 * Parse
 */
program.parse(process.argv);

/**
 * Validation
 */
if (typeof rawTemplate === 'undefined') {
  program.outputHelp();
  process.exit(1);
}

// resolve home dir
rawPath = rawPath.replace(/^~/, home);
const outDir = path.resolve(rawPath);

/**
 * Padding
 */
process.on('exit', function () {
  console.log();
});

/**
 * Custom npm client and internal templates
 */
let npmClient = {};
if (program.npmClient) {
  npmClient = { npmClient: program.npmClient };
}

/**
 * Questions
 */
const questions = [];

if (exists(outDir)) {
  questions.push({
    type: 'confirm',
    name: 'override',
    message: `The directory ${outDir} already exists, continue?`,
    default: false,
  });
}

/**
 * Prompt and Generate
 */
async function run () {
  const res = await inquirer.prompt(questions);
  if (res.override === false) {
    process.exit(1);
  }
  let fullTemplate;
  const templateParts = rawTemplate.split('/');
  if (templateParts.length === 1) {
    fullTemplate = `create-${rawTemplate}`;
  } else if (templateParts.length === 2) {
    fullTemplate = `${templateParts[0]}/create-${templateParts[1]}`;
  } else {
    console.log(chalk.red('Template format invalid'));
  }
  console.log(
    `Generating project at ${outDir}, using template ${chalk.blue(
      fullTemplate
    )}`
  );
  // https://saojs.org/guide/getting-started.html#using-generators
  const generator = `npm:${fullTemplate}`;
  const options = {
    generator,
    outDir,
    ...npmClient,
  };
  const app = sao(options);
  await app.run();
}

run();
