import { execSync } from 'child_process'
import { readdirSync } from 'fs'
import { remoteDoc } from './defaults'

export function checkWorkingDir () {
  checkGitAvailable()
  checkIsInGitProject()
  checkIsCleanGitStatus()
  checkIsInWorkingDir()
}

export function checkGitAvailable () {
  try {
    execSync('git --version')
  } catch (error) {
    throw new Error(
      '"apfe update" requires "git" to be available in path. Please update Git (https://git-scm.com)"'
    )
  }
}

export function checkIsInGitProject () {
  try {
    execSync('git rev-parse --is-inside-work-tree')
  } catch (error) {
    throw new Error(
     'apfe update requires to be executed in a git project. Please init Git (https://git-scm.com)'
    )
  }
}

export function checkIsCleanGitStatus () {
  const status = execSync('git status')
  const clean = ~status.indexOf('nothing to commit, working tree clean')
  if (!clean) {
    throw new Error(
      'apfe update requires to be executed in a clean working tree. Please git stash or git commit first'
    )
  }
}

export function checkIsInWorkingDir () {
  const featureDirs = ['src', 'build']
  const files = new Set(readdirSync(process.cwd()))
  const isIn = Array.every(featureDirs, feature => files.has(feature))
  if (!isIn) {
    throw new Error(
      `'apfe update' requires to be executed in your a plus template project dir. Please take a look at this ${remoteDoc}`
    )
  }
}
