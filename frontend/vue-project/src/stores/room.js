import { defineStore } from 'pinia'

export const useRoomStore = defineStore('room', {
  state: () => ({
    jugadores: [],
    roomState: { isPlaying: false },
    remainingTime: null,
  }),
  actions: {
    setJugadores(jugadores) {
      this.jugadores = jugadores
    },
    setRoomState(roomState) {
      this.roomState = roomState
    },
    setRemainingTime(time) {
      this.remainingTime = time
    },
  },
})
