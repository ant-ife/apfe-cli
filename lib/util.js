const clone = require('git-clone');
const os = require('os');
const ora = require('ora');
const { existsSync: exists } = require('fs');
const { isLocalPath, getTemplatePath } = require('../lib/local-path');
const { log, error } = require('../lib/logger');
const { sync: rm } = require('rimraf');
const path = require('path');
const home = require('user-home');
const inquirer = require('inquirer');


async function normalizeTemplate (gitOrLocal) {
  gitOrLocal = gitOrLocal.replace(/^~/, home);
  if (isLocalPath(gitOrLocal)) {
    const templatePath = getTemplatePath(gitOrLocal);
    if (exists(templatePath)) {
      return templatePath;
    } else {
      throw new Error(`Local template ${gitOrLocal} not found.`);
    }
  } else {
    return await cloneGit(gitOrLocal);
  }
}

function choose (opts) {
  return inquirer.prompt([opts]).then(resolve => resolve());
  // return new Promise((resolve) => {
  //   inquirer.prompt(
  //     [opts],
  //     resolve
  //   )
  // })
}

function confirm (message, cb) {
  inquirer.prompt([
    {
      type: 'confirm',
      message: message,
      name: 'confirm',
    },
  ]).then(answers => {
    answers.confirm && cb();
  });
}

function cloneGit (git) {
  const spinner = ora('cloning template...');
  const tmp = path.join(os.tmpdir(), 'apfe-git-template');

  if (exists(tmp)) rm(tmp);

  spinner.start();
  log(`downloading ${git} for template...`);

  return new Promise((resolve, reject) => {
    clone(git, tmp, { clone: clone }, function (err) {
      spinner.stop();
      if (err) {
        error('Failed to download repo ' + git + ': ' + err.message.trim());
        reject(err);
      }
      resolve(tmp);
    });
  });
}

module.exports.normalizeTemplate = normalizeTemplate;
module.exports.choose = choose;
module.exports.confirm = confirm;
module.exports.cloneGit = cloneGit;
