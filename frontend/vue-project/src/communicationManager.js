import axios from 'axios';
import { io } from 'socket.io-client';
import { useSessionStore } from './stores/session';
import { useRoomStore } from './stores/room';
import { useGameStore } from './stores/game';

let API_BASE_URL;
let SOCKET_URL;

// Vite define import.meta.env.MODE como 'production' o 'development'.
// Esto es el equivalente en el frontend a process.env.NODE_ENV en el backend.
if (import.meta.env.MODE === 'production') {
  // En producción, la URL de la API es relativa para que el proxy (Nginx) la gestione.
  API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
  // El socket se conecta a la URL específica definida en las variables de entorno.
  SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
} else {
  // En desarrollo, apuntamos directamente al backend en localhost:3000.
  API_BASE_URL = 'http://localhost:3000/api';
  SOCKET_URL = 'http://localhost:3000';
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
});

export const communicationManager = {
  // --- REST ---
  getToken() {
    const sessionStore = useSessionStore();
    return sessionStore.token;
  },

  setToken(token) {
    const sessionStore = useSessionStore();
    sessionStore.setToken(token);
  },

  async login(name, socketId) {
    const token = this.getToken();
    const response = await apiClient.post('/login', { name, socketId, token });
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  },

  async getWords() {
    return apiClient.get('/words');
  },

  async updateScore(name, score) {
    return apiClient.post('/scores', { name, score });
  },

  async getRoomPlayers() {
    return apiClient.get('/rooms');
  },

  async createRoom(roomSettings) {
    const sessionStore = useSessionStore();
    const hostPlayer = { name: sessionStore.playerName, socketId: socket.id, token: sessionStore.token };
    return apiClient.post('/rooms', { ...roomSettings, hostPlayer });
  },

  async updateRoom(roomId, roomSettings) {
    return apiClient.put(`/rooms/${roomId}`, roomSettings);
  },

  async getPublicRooms() {
    return apiClient.get('/rooms');
  },

  async getRoomDetails(roomId) {
    return apiClient.get(`/rooms/${roomId}`);
  },

  async joinRoom(roomId, player) {
    return apiClient.post(`/rooms/${roomId}/join`, { player });
  },

  async startGame(roomId) {
    return apiClient.post(`/rooms/${roomId}/start`);
  },

  async resetRoom() {
    return apiClient.delete('/rooms');
  },

  async removePlayer(roomId, playerSocketId, hostSocketId) {
    return apiClient.delete(`/rooms/${roomId}/player/${playerSocketId}`, { data: { hostSocketId } });
  },

  async makeHost(roomId, currentHostSocketId, targetPlayerSocketId) {
    return apiClient.post(`/rooms/${roomId}/make-host`, { currentHostSocketId, targetPlayerSocketId });
  },

  async resetReadyStatus(roomId) {
    return apiClient.post(`/rooms/${roomId}/reset-ready-status`);
  },

  async updatePlayerPage(page) {
    const token = this.getToken();
    if (token) {
      return apiClient.post('/player/page', { token, page });
    }
    return Promise.resolve();
  },

  // --- SOCKET ---
  connect() {
    if (!socket.connected) socket.connect();
  },

  /** Conecta y registra al jugador, devuelve socket.id */
  async connectAndRegister() {
    this.connect();

    await new Promise((resolve) => {
      if (socket.connected) return resolve();
      socket.once('connect', resolve);
    });

    console.log('Jugador conectado con socket ID:', socket.id);
    return socket.id;
  },

  onUpdatePlayerList(roomId) {
    socket.off('updatePlayerList');
    socket.on('updatePlayerList', (playerList) => {
      const roomStore = useRoomStore();
      roomStore.setJugadores(playerList);
    });
  },

  onUpdateRoomState(roomId) {
    socket.off('updateRoomState');
    socket.on('updateRoomState', (roomState) => {
      const roomStore = useRoomStore();
      roomStore.setRoomState(roomState);
      if (roomState.isPlaying) {
        const gameStore = useGameStore();
        gameStore.setEtapa('game');
      }
    });
  },

  onPlayerRemoved() {
    socket.off('player-removed');
    socket.on('player-removed', () => {
      const gameStore = useGameStore();
      gameStore.setEtapa('login');
    });
  },

  onUpdatePublicRoomList(callback) {
    socket.off('updatePublicRoomList');
    socket.on('updatePublicRoomList', (publicRooms) => {
      callback(publicRooms);
    });
  },

  sendReadyStatus(isReady) {
    const roomStore = useRoomStore(); // Get roomStore
    socket.emit('set-ready', { roomId: roomStore.roomId, isReady }); // Send roomId
  },

  disconnect() {
    socket.disconnect();
  }
};
