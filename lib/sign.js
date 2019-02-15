'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const home = require('user-home');

function doSign (file, cb) {
  const privateKeyFile = '.apfe/rsa-key/private.pem';
  console.log(chalk.yellow('# using the private.pem:'), chalk.green(`~/${privateKeyFile}`));
  const privateKey = fs.readFileSync(path.join(home, privateKeyFile)).toString();
  const f = fs.ReadStream(file);

  const sign = crypto.createSign('RSA-SHA1');

  f.on('data', d => {
    sign.update(d);
  });

  f.on('end', d => {
    const signture = sign.sign(privateKey, 'base64');
    cb(signture);
  });
}

module.exports = {
  doSign,
};
