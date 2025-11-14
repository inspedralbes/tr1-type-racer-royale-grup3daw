
import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: sessionStorage.getItem('token') || null,
    playerName: sessionStorage.getItem('playerName') || null,
    email: sessionStorage.getItem('email') || null,
    roomId: sessionStorage.getItem('roomId') || null,
    // La etapa actual del juego ('login', 'room-selection', 'lobby', 'game', 'final')
    // Persistimos la etapa en sessionStorage para poder restaurar la página después de reload
    etapa: sessionStorage.getItem('etapa') || 'login',
    isGuest: sessionStorage.getItem('isGuest') === 'true' || false,
  }),
  actions: {
    setSession(token, playerName, email, isGuest = false) {
      this.token = token;
      this.playerName = playerName;
      this.email = email;
      this.isGuest = isGuest;
      sessionStorage.setItem('playerName', playerName);
      // Guardar 'null' como una cadena vacía o eliminarlo si es null
      if (email === null) {
        sessionStorage.removeItem('email');
      } else {
        sessionStorage.setItem('email', email);
      }
      sessionStorage.setItem('isGuest', isGuest);
      this.setToken(token); // Call setToken to handle sessionStorage
      console.log('Session data set:', { token, playerName, email });
    },
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
    setEtapa(etapa) {
      this.etapa = etapa;
      // Persist the current page/etapa so on reload we can restore it
      try {
        if (etapa) sessionStorage.setItem('etapa', etapa);
        else sessionStorage.removeItem('etapa');
      } catch (e) {
        console.warn('Could not persist etapa to sessionStorage', e);
      }
    },
    /**
     * Limpia completamente la sesión, tanto en el sessionStorage como en el estado de Pinia.
     */
    resetState() {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('playerName');
      sessionStorage.removeItem('email');
      sessionStorage.removeItem('isGuest');
      sessionStorage.removeItem('roomId');
      sessionStorage.removeItem('etapa');
      // Llama al método $reset() de Pinia para restaurar el estado inicial.
      this.$reset();
    },
  },
});
