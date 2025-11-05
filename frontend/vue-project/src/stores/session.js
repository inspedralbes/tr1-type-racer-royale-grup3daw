
import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: sessionStorage.getItem('sessionToken') || null,
    playerName: sessionStorage.getItem('playerName') || null,
    email: sessionStorage.getItem('email') || null,
    roomId: sessionStorage.getItem('roomId') || null,
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
    resetState() {
      this.token = null;
      this.playerName = null;
      this.email = null;
      this.roomId = null;
      sessionStorage.removeItem('sessionToken');
      sessionStorage.removeItem('playerName');
      sessionStorage.removeItem('email');
      sessionStorage.removeItem('roomId');
    },
  },
});
