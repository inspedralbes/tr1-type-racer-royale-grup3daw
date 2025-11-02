import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: sessionStorage.getItem('token') || null,
    playerName: sessionStorage.getItem('playerName') || null,
    roomId: sessionStorage.getItem('roomId') || null,
  }),
  actions: {
    setToken(token) {
      this.token = token;
      sessionStorage.setItem('token', token);
    },
    setPlayerName(name) {
      this.playerName = name;
      sessionStorage.setItem('playerName', name);
    },
    setRoomId(roomId) {
      this.roomId = roomId;
      if (roomId) {
        sessionStorage.setItem('roomId', roomId);
      } else {
        sessionStorage.removeItem('roomId');
      }
    },
    /**
     * Limpia completamente la sesión, tanto en el sessionStorage como en el estado de Pinia.
     */
    clearSession() {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('playerName');
      sessionStorage.removeItem('roomId');
      // Llama al método $reset() de Pinia para restaurar el estado inicial.
      this.$reset();
    },
  },
});