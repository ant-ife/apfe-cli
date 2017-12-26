#!/usr/bin/env node

import { Command } from 'commander'
import home from 'user-home'
import path from 'path'
import ora from 'ora'
import fs from 'fs-extra'
import {pki} from 'node-forge'
import {success, error} from '../lib/logger'
import {confirm} from '../lib/util'

const {rsa} = pki

const DEFAULT_PATH = path.join(home, '.apfe/rsa-key/')
const program = new Command('apfe pack genkey')
program
  .usage(' ')
  .parse(process.argv)

preCheck()

function preCheck () {
  if (fs.pathExistsSync(DEFAULT_PATH)) {
    const message = `${DEFAULT_PATH} is not empty, overwrite the path ?`
    confirm(message, entry)
  } else {
    entry()
  }
}

function entry () {
  const targetPath = DEFAULT_PATH
  const spinner = ora(`generate rsa key pairs, path: ${targetPath}`)

  spinner.start()

  rsa.generateKeyPair({bits: 1024}, (err, keypair) => {
    const privatePem = pki.privateKeyToPem(keypair.privateKey)
    const publicPem = pki.publicKeyToPem(keypair.publicKey)

    if (!err) {
      fs.outputFileSync(path.join(targetPath, 'private.pem'), privatePem)
      fs.outputFileSync(path.join(targetPath, 'public.pem'), publicPem)
      spinner.stop()
      success(`generate rsa key pair success, path: ${targetPath}`)
      success('keep the key pairs carefully')
    } else {
      error('generate rsa key pair failed, please retry')
    }
  })
}
