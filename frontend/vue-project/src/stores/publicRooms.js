import { defineStore } from 'pinia';

export const usePublicRoomsStore = defineStore('publicRooms', {
  state: () => ({
    rooms: [],
  }),
  actions: {
    setRooms(rooms) {
      this.rooms = rooms;
    },
    resetState() {
      this.rooms = [];
    },
  },
});
