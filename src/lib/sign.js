'use strict'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import home from 'user-home'


function doSign (file, cb) {
  const privateKeyFile = '.apfe/rsa-key/private.pem'
  console.log(chalk.yellow('# using the private.pem:'), chalk.green(`~/${privateKeyFile}`))
  const privateKey = fs.readFileSync(path.join(home, privateKeyFile)).toString()
  const f = fs.ReadStream(file)

  const sign = crypto.createSign('RSA-SHA1')

  f.on('data', d => {
    sign.update(d)
  })

  f.on('end', d => {
    const signture = sign.sign(privateKey, 'base64')
    cb(signture)
  })
}

export default {
  doSign,
}
