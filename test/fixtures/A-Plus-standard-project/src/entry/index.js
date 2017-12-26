
import Vue from '~libs/vue-init'
import App from '~views/index'
import router from '~router/index'
import store from '~store/index'
import { language, langPkgs } from '~i18n/index'
import '~styles/index.less'

langPkgs[language]((i18n) => {
  window.i18n = i18n.default
  const app = new Vue({
    ...App,
    router,
    store,
  })
  app.$mount('#app')
})

