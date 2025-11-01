import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: sessionStorage.getItem('session_token') || null,
    playerName: sessionStorage.getItem('player_name') || null,
    roomId: sessionStorage.getItem('room_id') || null,
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
    setPlayerName(name) {
      this.playerName = name;
      if (name) {
        sessionStorage.setItem('player_name', name);
      } else {
        sessionStorage.removeItem('player_name');
      }
    },
    setRoomId(roomId) {
      this.roomId = roomId;
      if (roomId) {
        sessionStorage.setItem('room_id', roomId);
      } else {
        sessionStorage.removeItem('room_id');
      }
    },
    clearRoomId() {
      this.roomId = null;
      sessionStorage.removeItem('room_id');
    },
  },
})
