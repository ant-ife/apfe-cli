import 'es6-promise/auto'
import FastClick from 'fastclick'
import Vue from 'vue'
import * as filters from '~utils/filters'
import * as directives from '~utils/directives'
import gettext from '~utils/gettext'
import components from '~components/index'

/**
 * install gettext
 */
Vue.use(gettext)

// Init FastClick
FastClick.attach(document.body)

/**
 * Register global filter for all views
 */
for (let key in filters) {
  Vue.filter(key, filters[key])
}

/**
 * Register global directive for all views
 */
for (let key in directives) {
  Vue.directive(key, directives[key])
}

/**
 * Register global component for all views
 */
for (let key in components) {
  Vue.component(key, components[key])
}

export default Vue
