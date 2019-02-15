const assert = require('assert');

const remoteConfig = require('../../lib/defaults');

describe('lib/default.test.js', () => {
  it('default remote config', () => {
    assert(remoteConfig.remoteGit === 'https://github.com/ant-ife/vue-biz-app-template.git');
    assert(remoteConfig.remoteDoc === 'https://github.com/ant-ife/vue-biz-app-template/wiki');
  });
});
