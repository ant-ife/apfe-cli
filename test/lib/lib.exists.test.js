const { join } = require('path')
const test = require('ava')

const {
  existsFile,
  existsDir,
} = require('../../lib/exists')

test('existsFile', async t => {
  t.true(existsFile(join(__dirname, 'lib.exists.test.js')))
})

test('existsDir', async t => {
  t.true(existsDir(join(__dirname, '..')))
})
