const { execSync } = require('child_process');
const { readdirSync } = require('fs');
const { remoteDoc } = require('./defaults');

function checkWorkingDir () {
  checkGitAvailable();
  checkIsInGitProject();
  checkIsCleanGitStatus();
  checkIsInWorkingDir();
}

function checkGitAvailable () {
  try {
    execSync('git --version');
  } catch (error) {
    throw new Error(
      '"apfe update" requires "git" to be available in path. Please update Git (https://git-scm.com)"'
    );
  }
}

function checkIsInGitProject () {
  try {
    execSync('git rev-parse --is-inside-work-tree');
  } catch (error) {
    throw new Error(
      'apfe update requires to be executed in a git project. Please init Git (https://git-scm.com)'
    );
  }
}

function checkIsCleanGitStatus () {
  const status = execSync('git status');
  const clean = ~status.indexOf('nothing to commit, working tree clean');
  if (!clean) {
    throw new Error(
      'apfe update requires to be executed in a clean working tree. Please git stash or git commit first'
    );
  }
}

function checkIsInWorkingDir () {
  const featureDirs = ['src', 'build'];
  const files = new Set(readdirSync(process.cwd()));
  const isIn = Array.every(featureDirs, feature => files.has(feature));
  if (!isIn) {
    throw new Error(
      `'apfe update' requires to be executed in your a plus template project dir. Please take a look at this ${remoteDoc}`
    );
  }
}

module.exports.checkWorkingDir = checkWorkingDir;
module.exports.checkGitAvailable = checkGitAvailable;
module.exports.checkIsInGitProject = checkIsInGitProject;
module.exports.checkIsCleanGitStatus = checkIsCleanGitStatus;
module.exports.checkIsInWorkingDir = checkIsInWorkingDir;
