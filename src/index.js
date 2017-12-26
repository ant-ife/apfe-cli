import { composeApps } from './lib/compose-apps/index'
import * as factory from './lib/compose-apps/plugin-factory'

module.exports = {
  composeApps,
  ...factory,
}
