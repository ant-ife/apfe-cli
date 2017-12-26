import os from 'os'
import path from 'path'
import fse from 'fs-extra'
import deepmerge from 'deepmerge'
import gitBranch from 'git-branch'
import shelljs from 'shelljs'
import globby from 'globby'
import { error, success, warn } from './logger'
import { checkWorkingDir } from './check-env'
import { generateUpdate } from './generate'
import Ware from './ware'

function exec (command, logOutput) {
  return new Promise((resolve, reject) => {
    let stderr
    let stdout = ''
    const child = shelljs.exec(command, { async: true, silent: true })

    child.stdout.on('data', data => {
      stdout += data
      if (logOutput) {
        process.stdout.write(data)
      }
    })

    child.stderr.on('data', data => {
      stderr += data
      process.stderr.write(data)
    })

    child.on('exit', code => {
      (code === 0)
        ? resolve(stdout)
        : reject(new Error(`Command '${command}' exited with code ${code}:
stderr: ${stderr}
stdout: ${stdout}`))
    })
  })
}

export async function gitDiff (template, modules = [], verbose) {
  try {
    success('Checking directory env...')
    checkWorkingDir()
  } catch (err) {
    error(err.message)
    return
  }

  const tmpDir = path.resolve(os.tmpdir(), 'apfe-git-upgrade')
  const mods = modules.join('-')
  const branch = `${Date.now()}-apfe-update-${mods}`
  let originBranch, patchPath

  try {
    const gitDir = await searchGitFile(process.cwd())
    originBranch = gitBranch.sync(gitDir)

    await exec(`git checkout -b ${branch}`, false)

    // generate template according modules in tmpDir
    const { opts } = await generateUpdate(modules, template, tmpDir)
    const ware = new Ware()
    const usedModules = []
    ware
      .use(diffSettings)

    await ware.run(modules, usedModules, opts, tmpDir)

    const unusedModules = modules.filter(m => !~usedModules.indexOf(m))
    if (unusedModules.length) {
      const single = unusedModules.length === 1
      throw new Error(`The ${unusedModules.join(' ')} ${single ? 'is' : 'are'} not defined by your template's meta.js, please check it first!`)
    }

    // merge dirs and files according the modules
    success('Apply install changes')
    await exec('git add .', false)

    success('Commit current project sources')
    await exec('git commit -m "Project snapshot"', false)

    success('Generate the patch between the 2 versions')
    const diffOutput = await
      exec(`git diff --binary --no-color ${originBranch} ${branch}`, verbose)

    success('Save the patch in tmp directory')
    patchPath =
      path.resolve(os.tmpdir(), `upgrade_${originBranch}_${branch}.patch`)
    await fse.outputFile(patchPath, diffOutput)

    await exec(`git checkout ${originBranch}`)

    try {
      success('Apply the patch')
      await exec(`git apply --3way ${patchPath}`, verbose)
    } catch (err) {
      warn(
        'The upgrade process succeeded but there might be conflicts to be resolved. ' +
        'See above for the list of files that have merge conflicts.')
    } finally {
      success('Upgrade done')
    }
  } catch (err) {
    await exec(`git checkout ${originBranch}`)
    if (~err.message.indexOf('exited with')) {
      success(`Your ${modules.join(' ')} is update to date!`)
    } else {
      error(err.stack)
    }
  } finally {
    try {
      await exec(`git branch -d ${branch} -f`)
      // remove tmp file
      await fse.remove(tmpDir)
      await fse.remove(patchPath)
    } catch (err) {
    }
  }
}

async function searchGitFile (dir) {
  let deps = 10
  while (!(await globby('.git', { cwd: dir })).length && deps > 0) {
    dir = path.resolve(dir, '..')
    --deps
  }

  if (!(await globby('.git', { cwd: dir })).length) {
    throw new Error('Could not find .git file')
  } else {
    return path.resolve(dir)
  }
}

async function diffSettings (modules, usedModules, opts, tmpDir, next) {
  const settings = []
  modules.forEach(module => {
    if (opts.settings[module]) {
      settings.push(opts.settings[module])
      usedModules.push(module)
    }
  })

  let pkgjson = {}
  let replaceFiles = []
  const pkgName = 'package.json'
  settings.forEach(filter => {
    if (filter[pkgName]) {
      pkgjson = deepmerge(pkgjson, filter[pkgName])
    }
    if (filter.files) {
      replaceFiles = replaceFiles.concat(filter.files)
    }
  })

  if (replaceFiles) {
    const files = await globby(replaceFiles, { cwd: tmpDir })
    files.forEach(file => {
      const from = path.resolve(tmpDir, file)
      const to = path.resolve(process.cwd(), file)
      return fse.copySync(from, to, { overwrite: true })
    })
  }

  if (Object.keys(pkgjson).length) {
    const currentPath = path.resolve(process.cwd(), pkgName)
    let current = await fse.readJson(currentPath)
    current = deepmerge(current, pkgjson)
    await fse.outputFile(currentPath, JSON.stringify(current, null, 2))
  }

  await next()
}
