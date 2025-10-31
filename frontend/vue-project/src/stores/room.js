import { defineStore } from 'pinia'

export const useRoomStore = defineStore('room', {
  state: () => ({
    jugadores: [],
    roomState: { isPlaying: false },
    remainingTime: null,
    roomId: null, // New property
    room: null, // New property to store full room details
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
    setRoomId(id) { // New action
      this.roomId = id;
    },
    setRoom(roomDetails) { // New action
      this.room = roomDetails;
      this.roomId = roomDetails.id;
      this.roomState = {
        isPlaying: roomDetails.isPlaying,
        gameStartTime: roomDetails.gameStartTime,
        time: roomDetails.time,
        gameMode: roomDetails.gameMode,
      };
      this.jugadores = roomDetails.players;
    },
  },
})
