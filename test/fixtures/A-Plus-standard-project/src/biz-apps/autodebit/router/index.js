import * as pages from '../constants/pages'

export default [
  {
    meta: {
      titleKey: 'auto.debit.title',
    },
    name: pages.AUTO_DEBIT_INDEX,
    path: '/autodebit',
    component: r => require.ensure([], () => r(require('../views/index')), 'autodebit')},
  {
    meta: {
      titleKey: 'auto.debit.title',
    },
    name: pages.AUTO_DEBIT_LIST,
    path: '/autodebit/list',
    component: r => require.ensure([], () => r(require('../views/list')), 'autodebit'),
  },
  {
    meta: {
      titleKey: 'auto.debit.title',
    },
    name: pages.AUTO_DEBIT_DETAIL,
    path: '/autodebit/detail',
    component: r => require.ensure([], () => r(require('../views/detail')), 'autodebit'),
  },
]
