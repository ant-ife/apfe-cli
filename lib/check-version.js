const request = require('request');
const chalk = require('chalk');
const semver = require('semver');
const packageConfig = require('../package.json');

const moduleName = packageConfig.name;

module.exports = function () {
  return new Promise((resolve, reject) => {
    // Ensure minimum supported node version is used
    if (!semver.satisfies(process.version, packageConfig.engines.node)) {
      return console.log(chalk.red(
        '  You must upgrade Node.js to >=' + packageConfig.engines.node + '.x to use apfe-cli'
      ));
    }

    request({
      url: `https://registry.npmjs.org/${moduleName}`,
      timeout: 1000,
    }, function (err, res, body) {
      if (err) {
        // if error, ignore check
        reject(err);
      }
      if (!err && res.statusCode === 200) {
        const latestVersion = JSON.parse(body)['dist-tags'].latest;
        const localVersion = packageConfig.version;
        if (semver.lt(localVersion, latestVersion)) {
          console.log(chalk.yellow(`  A newer version of ${moduleName} is available.`));
          console.log();
          console.log('  latest:    ' + chalk.green(latestVersion));
          console.log('  installed: ' + chalk.red(localVersion));
          console.log();
        }
      }
      resolve();
    });
  });
};
