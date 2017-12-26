'use strict'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import home from 'user-home'


function doSign (file, cb) {
  const privateKey = fs.readFileSync(path.join(home, '.apfe/rsa-key/private.pem')).toString()
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
