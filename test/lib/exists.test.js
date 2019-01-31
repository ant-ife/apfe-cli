const { join } = require('path');
const assert = require('assert');

const {
  existsFile,
  existsDir,
} = require('../../lib/exists');

describe('lib/exists.test.js', () => {
  it('existsFile', () => {
    assert(existsFile(join(__dirname, 'exists.test.js')));
  });

  it('existsDir', () => {
    assert(existsDir(join(__dirname, '..')));
  });
});

