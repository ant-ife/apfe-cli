const fs = require('fs');

const exists = type => target => {
  try {
    const status = fs.statSync(target);
    const func = type === 'file' ? status.isFile : status.isDirectory;
    return !!func.call(status);
  } catch (ex) {
    return false;
  }
};

module.exports.existsFile = exists('file');
module.exports.existsDir = exists('dir');
