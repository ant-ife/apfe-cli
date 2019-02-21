#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');
const { existsSync: exists } = require('fs');
const path = require('path');
const home = require('user-home');
const inquirer = require('inquirer');
const sao = require('sao');

let rawTemplate;
let rawDirectory;

/**
 * Usage
 */
program
  .arguments('[template]')
  .arguments('[project-directory]')
  .action(function (template, directory) {
    if (directory === undefined) {
      // 1 arg -> project-directory
      rawDirectory = template;
    } else {
      // 2 args -> template, project-directory
      rawTemplate = template;
      rawDirectory = directory;
    }
  })
  .option('-c, --npm-client <client>', 'custom npm client').usage(`
  $ apfe create [template] <project-directory> [options]`);

/**
 * Help
 */
program.on('--help', function () {
  console.log(`
Examples:
  ${chalk.green('# create project my-app with create-h5-app template')}
  $ apfe create create-h5-app my-app

  ${chalk.green(
    '# create project my-app with create-h5-app template using custom npm client'
  )}
  $ apfe create create-h5-app my-app -c mynpm

  ${chalk.green('# create project my-app, choose public template from list')}
  $ apfe create my-app
  
  ${chalk.green('# create project my-app in parent directory')}
  $ apfe create ../my-app
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
    type: 'npm',
    // https://saojs.org/guide/getting-started.html#using-generators
    source: 'npm:create-h5-app',
  },
];

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
  let generator;
  if (rawTemplate) {
    console.log(
      `Generating project at ${to}, using template ${chalk.blue(rawTemplate)}`
    );
    // https://saojs.org/guide/getting-started.html#using-generators
    generator = `npm:${rawTemplate}`;
  } else {
    const res = await inquirer.prompt(questions);
    console.log(
      `Generating project at ${to}, using template ${chalk.blue(
        res.template.name
      )}`
    );
    generator = res.template.source;
  }
  const options = {
    generator,
    outDir: to,
    ...npmClient,
  };
  const app = sao(options);
  await app.run();
}

run();
