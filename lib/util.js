import clone from 'git-clone';
import os from 'os';
import ora from 'ora';
import { existsSync as exists } from 'fs';
import { isLocalPath, getTemplatePath } from '../lib/local-path';
import { log, error } from '../lib/logger';
import { sync as rm } from 'rimraf';
import path from 'path';
import home from 'user-home';
import inquirer from 'inquirer';

export async function normalizeTemplate (gitOrLocal) {
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

export function choose (opts) {
  return inquirer.prompt([opts]).then(resolve => resolve());
  // return new Promise((resolve) => {
  //   inquirer.prompt(
  //     [opts],
  //     resolve
  //   )
  // })
}

export function confirm (message, cb) {
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

export function cloneGit (git) {
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
