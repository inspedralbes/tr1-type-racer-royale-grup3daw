
import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: sessionStorage.getItem('sessionToken') || null,
    playerName: sessionStorage.getItem('playerName') || null,
    email: sessionStorage.getItem('email') || null,
    roomId: sessionStorage.getItem('roomId') || null,
    // La etapa actual del juego ('login', 'room-selection', 'lobby', 'game', 'final')
    // Persistimos la etapa en sessionStorage para poder restaurar la página después de reload
    etapa: sessionStorage.getItem('etapa') || 'login',
  }),
  actions: {
    setSession(token, playerName, email) {
      this.token = token;
      this.playerName = playerName;
      this.email = email;
      sessionStorage.setItem('sessionToken', token);
      sessionStorage.setItem('playerName', playerName);
      sessionStorage.setItem('email', email);
      console.log('Session data set:', { token, playerName, email });
    },
    setToken(token) {
      this.token = token;
      sessionStorage.setItem('sessionToken', token);
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
    clearSession() {
      this.token = null;
      this.playerName = null;
      this.email = null;
      this.roomId = null;
      this.etapa = 'login';
      sessionStorage.removeItem('sessionToken');
      sessionStorage.removeItem('playerName');
      sessionStorage.removeItem('email');
      sessionStorage.removeItem('roomId');
      sessionStorage.removeItem('etapa');
    },
  },
});
