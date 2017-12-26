<template>
  <div class="autodebit autodebit-index">
    <header>
      <icon name="aplus"/>
    </header>
    <section>
      <p class="title">{{ 'bizapp.autodebit.title' | gettext }}</p>
      <p class="title">{{ signTimes }}</p>
      <typer :slogans="slogans"/>
    </section>
    <section>
      <div v-for="link in links" :key="link.name" >
        <router-link :to="{name: link.name}">
          {{ link.display }}
        </router-link>
      </div>
    </section>
  </div>
</template>
<script>
  import {
    AUTO_DEBIT_DETAIL,
    AUTO_DEBIT_LIST,
  } from '../constants/pages'
  import typer from '~components/typer.vue'
  import { mapState } from 'vuex'
  import { gettext } from '~utils/gettext'
  import request from '~utils/request'
  import { API_INIT } from '~constants/apis'

  export default {
    components: {
      typer,
    },

    data () {
      return {
        links: [
          {
            name: AUTO_DEBIT_DETAIL,
            display: 'go to detail',
          },
          {
            name: AUTO_DEBIT_LIST,
            display: 'go to list',
          },
          {
            name: 'home',
            display: 'back to home',
          },
        ],
        slogans: [
          'How can we run this autodebit biz-app?',
          'Totally, five steps:',
          '1. Merge routes, check src/router/index.js',
          '2. Merge stores, check src/store/index.js',
          '3. Merge icons, check src/utils/load-icons.js',
          '4. Merge less, check src/styles/index.less',
          '5. Merge i18n, check src/locales/*.js',
        ],
      }
    },

    mounted () {
      request(API_INIT).then(res => {
        console.log(JSON.stringify(res, null, 2))
      })
    },

    computed: {
      ...mapState({
        signTimes: state => {
          return gettext('autodebit.sign.times', { times: state.autodebit.signTimes })
        },
      }),
    },
  }
</script>
