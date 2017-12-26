<template>
  <div>
    <div class="autodebit autodebit-detail">
      <section>
        <p>This is detail page</p>
      </section>
      <section>
        <div v-for="link in links" :key="link.name" >
          <router-link :to="{name: link.name}">
            {{ link.display }}
          </router-link>
        </div>
      </section>
    </div>
  </div>
</template>
<script>
  import {
    AUTO_DEBIT_INDEX,
    AUTO_DEBIT_LIST,
  } from '../constants/pages'
  import { UPDATE_SIGNING_INFO } from '../constants/mutation-types'
  import store from '~store'

  export default {
    beforeRouteEnter (to, from, next) {
      store.commit(UPDATE_SIGNING_INFO)
      next()
    },

    data () {
      return {
        links: [
          {
            name: AUTO_DEBIT_INDEX,
            display: 'go to autodebit index',
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
      }
    },
  }
</script>
