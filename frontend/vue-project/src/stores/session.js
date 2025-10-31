import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: sessionStorage.getItem('session_token') || null,
    playerName: null, // New property
  }),
  actions: {
    setToken(token) {
      this.token = token
      sessionStorage.setItem('session_token', token)
    },
    clearToken() {
      this.token = null
      sessionStorage.removeItem('session_token')
    },
    setPlayerName(name) { // New action
      this.playerName = name;
    },
  },
})
