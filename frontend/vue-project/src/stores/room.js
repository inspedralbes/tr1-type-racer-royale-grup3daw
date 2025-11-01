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
      console.log('Updating jugadores:', jugadores);
      this.jugadores.splice(0, this.jugadores.length, ...jugadores);
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
      if (roomDetails) {
        this.room = roomDetails;
        this.roomId = roomDetails.id;
        this.roomState = {
          isPlaying: roomDetails.isPlaying,
          gameStartTime: roomDetails.gameStartTime,
          time: roomDetails.time,
          gameMode: roomDetails.gameMode,
        };
        this.jugadores = roomDetails.players;
      } else {
        // Reset room state if roomDetails is null
        this.room = null;
        this.roomId = null;
        this.roomState = { isPlaying: false };
        this.jugadores = [];
      }
    },
    resetState() {
      this.jugadores = [];
      this.roomState = { isPlaying: false };
      this.remainingTime = null;
      this.roomId = null;
      this.room = null;
    },
  },
})
