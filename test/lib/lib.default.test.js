const test = require('ava')

const remoteConfig = require('../../lib/defaults')

test('default remote config', async t => {
  t.true(remoteConfig.remoteGit === 'https://github.com/ant-ife/vue-biz-app-template.git')
  t.true(remoteConfig.remoteDoc === 'https://github.com/ant-ife/vue-biz-app-template/wiki')
})
