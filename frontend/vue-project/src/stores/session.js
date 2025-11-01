import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: sessionStorage.getItem('playerToken') || null,
    roomId: sessionStorage.getItem('roomId') || null, // Persist roomId
    playerName: sessionStorage.getItem('playerName') || null,
  }),
  actions: {
    setToken(token) {
      this.token = token;
      if (token) {
        sessionStorage.setItem('playerToken', token);
      } else {
        sessionStorage.removeItem('playerToken');
      }
    },
    clearToken() {
      this.setToken(null); // Use setToken to also clear sessionStorage
    },
    setRoomId(roomId) {
      this.roomId = roomId;
      if (roomId) {
        sessionStorage.setItem('roomId', roomId);
      } else {
        sessionStorage.removeItem('roomId');
      }
    },
    clearRoomId() {
      this.setRoomId(null); // Use setRoomId to also clear sessionStorage
    },
    setPlayerName(name) {
      this.playerName = name;
      if (name) {
        sessionStorage.setItem('playerName', name);
      } else {
        sessionStorage.removeItem('playerName');
      }
    },
    resetState() {
      this.setToken(null); // Use setToken to also clear sessionStorage
      this.setPlayerName(null); // Use setPlayerName to also clear sessionStorage
      this.setRoomId(null); // Use setRoomId to also clear sessionStorage
    },
  },
});
