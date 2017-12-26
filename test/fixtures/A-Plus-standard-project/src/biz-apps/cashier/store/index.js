import { ADD_CREDIT_CARD } from '../constants/mutation-types'

export default {
  state: {
    creditCards: 1,
  },

  mutations: {
    [ADD_CREDIT_CARD] (state) {
      state.creditCards = state.creditCards * 2
    },
  },

  actions: {
  },

  getters: {
  },
}
