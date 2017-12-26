<template>
  <div class="cashier cashier-index">
    <header>
      <icon name="creditcard"/>
    </header>
    <section>
      <p class="title">{{ 'bizapp.cashier.title' | gettext }}</p>
      <p class="title">{{ creditcards }}</p>
    </section>
  </div>
</template>
<script>
  import store from '~store'
  import { mapState } from 'vuex'
  import { gettext } from '~utils/gettext'
  import { ADD_CREDIT_CARD } from '../constants/mutation-types'

  export default {
    beforeRouteEnter (to, from, next) {
      store.commit(ADD_CREDIT_CARD)
      next()
    },

    computed: {
      ...mapState({
        creditcards: state => {
          return gettext('cashier.creditcards', { cards: state.cashier.creditCards })
        },
      }),
    },
  }
</script>
