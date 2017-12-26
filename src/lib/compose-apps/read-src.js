import { resolve, join, basename } from 'path'
import fs from 'fs'

const LOGGER_PREFIX = '***[compose biz-apps read-src]***'

function App (path) {
  this.path = path
  this.name = basename(path)
  const subAppsPath = join(path, 'biz-apps')
  if (existsDir(subAppsPath)) {
    this.subApps = fs.readdirSync(subAppsPath)
      .map(p => new App(join(path, p)))
  }
}

export default function readSrc (src, ...apps) {
  if (!apps.length) {
    throw new Error(`${LOGGER_PREFIX} requires at least one app`)
  }

  for (let app of apps) {
    if (!app) throw new Error(`${LOGGER_PREFIX} ${app} of biz-app args is not a valid biz-app`)
  }

  const container = isValidContainerApp(resolve(src))
  let bizapps = apps.map(app => resolve(join(src, `biz-apps/${app}`)))
  bizapps = bizapps.filter(isValidBizApp)

  return {
    bizapps: bizapps.map(app => new App(app)),
    container: new App(container)
  }
}

function isValidContainerApp (container) {
  const validAppFileRequires = [
    'libs/vue-init.js',
    'store/index.js',
    'router/index.js',
    'entry/index.js'
  ]

  validAppFileRequires.forEach(file => {
    const jf = join(container, file)
    if (!existsFile(jf)) {
      throw new Error(`${LOGGER_PREFIX} ${file} is not exist! It's not Alipay+ project.\n Maybe you need to init that by 'apfe init your-project'`)
    }
  })

  return container
}

function isValidBizApp (app) {
  if (!existsDir(app)) {
    throw new Error(`${LOGGER_PREFIX} ${app} is not exist, it's not a valid biz-app`)
  }

  const validAppFileRequires = ['store/index.js', 'router/index.js']
  validAppFileRequires.forEach(file => {
    const jf = join(app, file)
    if (!existsFile(jf)) {
      throw new Error(`${LOGGER_PREFIX} ${app} ${file} is not exist! Maybe it's not need to be a biz app`)
    }
  })

  return app
}

const exists = type => fileOrDir => {
  try {
    const status = fs.statSync(fileOrDir)
    const func = type === 'file' ? status.isFile : status.isDirectory
    if (func.call(status)) {
      return true
    }
  } catch (e) {
    return false
  }
}

export const existsFile = exists('file')
export const existsDir = exists('dir')
