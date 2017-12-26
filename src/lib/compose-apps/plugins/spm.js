import {
  babelTransform,
  duplicateImportPlugin,
  babelAppsFactory,
  spreadLocalePlugin,
} from '../utils'
import {
  composePlugin,
} from '../plugin-factory'

// 1. change the container app's constants/spm.js files, import and use the biz-apps constants/spm.js
/*
FROM: constants/spm.js
import cashier from '~biz-apps/cashier/constants/spm'

export default Object.assign({}, cashier, {
  [PAGE.ERROR]: {
    $: '',
  },
})

TO:
import * as PAGE from './pages'

import cashier from '~biz-apps/cashier/constants/spm'
import autoDebit from '~biz-apps/auto-debit/constants/spm'
import paymentResult from '~biz-apps/payment-result/constants/spm'
import topup from '~biz-apps/topup/constants/spm'

export default Object.assign({}, cashier, autoDebit, paymentResult, topup, {
  [PAGE.ERROR]: {
    $: '',
  },
})

SUPPORT OPERATIONS: CRUD
*/

const IMPORT_PATH = 'constants/spm'

export default composePlugin('spm', `${IMPORT_PATH}.js`, async (scripts, project, config) => {
  const { bizapps } = project
  const ctx = {
    apps: bizapps.map(babelAppsFactory(config.spm)),
    unusedImportVars: new Set(),
  }
  await babelTransform(
    scripts[0],
    {
      plugins: [
        duplicateImportPlugin(ctx, config, IMPORT_PATH),
        spreadLocalePlugin(ctx),
      ],
    }
  )
})
