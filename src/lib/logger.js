import {
  chalk,
} from 'xutil'
import { format } from 'util'

const prefix = '   apfe'
const sep = chalk.gray('·')

export const loggerFactory = (color) => (...args) => {
  const msg = format.apply(format, args)
  console.log(chalk[color](prefix), sep, msg)
}

/**
 * Log a `message` to the console.
 *
 * @param {String} message
 */
export const log = loggerFactory('white')

/**
 * Log a success `message` to the console and exit.
 *
 * @param {String} message
 */
export const success = loggerFactory('cyan')

export const warn = loggerFactory('yellow')

/**
 * Log an error `message` to the console and exit.
 *
 * @param {String} message
 */

export function fatal (message) {
  error(message)
  process.exit(1)
}

export function error (message) {
  if (message instanceof Error) message = message.message.trim()
  const msg = format.apply(format, arguments)
  console.error(chalk.red(prefix), sep, msg)
}

export default {
  log,
  fatal,
  error,
  success,
  warn,
  loggerFactory,
}
