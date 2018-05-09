'use strict'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import home from 'user-home'


function doSign (file, cb) {
  const privateKeyFile = path.join(home, '.apfe/rsa-key/private.pem')
  const publicKeyFile = path.join(home, '.apfe/rsa-key/public.pem')
  console.log(`using the private.pem: ${privateKeyFile}`)
  console.log(`using the public.pem: ${publicKeyFile}`)
  const privateKey = fs.readFileSync(privateKeyFile).toString()
  const publicKey = fs.readFileSync(publicKeyFile).toString()
  console.log(`\n${publicKey}\n`)
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
