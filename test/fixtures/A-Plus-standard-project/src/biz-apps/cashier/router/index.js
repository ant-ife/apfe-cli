import * as pages from '../constants/pages'

export default [
  {
    meta: {
      titleKey: 'cashier.title',
    },
    name: pages.CASHIER_INDEX,
    path: '/cashier',
    component: r => require.ensure([], () => r(require('../views/index')), 'cashier'),
  },
]
