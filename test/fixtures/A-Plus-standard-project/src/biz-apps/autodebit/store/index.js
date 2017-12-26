import { UPDATE_SIGNING_INFO } from '../constants/mutation-types'

export default {
  state: {
    signTimes: 0,
  },

  mutations: {
    [UPDATE_SIGNING_INFO] (state) {
      state.signTimes ++
    },
  },

  actions: {
  },

  getters: {
  },
}
