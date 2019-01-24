const chalk = require('chalk');
const { format } = require('util');

const prefix = '   apfe';
const sep = chalk.gray('·');

const loggerFactory = (color) => (...args) => {
  const msg = format.apply(format, args);
  console.log(chalk[color](prefix), sep, msg);
};

/**
 * Log a `message` to the console.
 *
 * @param {String} message
 */
const log = loggerFactory('white');

/**
 * Log a success `message` to the console and exit.
 *
 * @param {String} message
 */
const success = loggerFactory('cyan');
const warn = loggerFactory('yellow');

/**
 * Log an error `message` to the console and exit.
 *
 * @param {String} message
 */

const fatal = message => {
  error(message);
  process.exit(1);
};

const error = function (message) {
  if (message instanceof Error) message = message.message.trim();
  const msg = format.apply(format, arguments);
  console.error(chalk.red(prefix), sep, msg);
};

module.exports = {
  log,
  fatal,
  error,
  success,
  warn,
  loggerFactory,
};

module.exports.loggerFactory = loggerFactory;
module.exports.log = log;
module.exports.success = success;
module.exports.warn = warn;
module.exports.fatal = fatal;
module.exports.error = error;
