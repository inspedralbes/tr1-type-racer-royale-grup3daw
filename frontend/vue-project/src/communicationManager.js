import axios from 'axios';
import { io } from 'socket.io-client';
import { useSessionStore } from './stores/session';
import { useRoomStore } from './stores/room';
import { useGameStore } from './stores/game';

import { usePublicRoomsStore } from './stores/publicRooms';

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

apiClient.interceptors.request.use((config) => {
  const sessionStore = useSessionStore();
  const token = sessionStore.token;
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
});

export function setupSocketListeners() {
  socket.on('updatePlayerList', (playerList) => {
    const roomStore = useRoomStore();
    roomStore.setJugadores(playerList);
  });

  socket.on('updateRoomState', (roomState) => {
    const roomStore = useRoomStore();
    roomStore.setRoomState(roomState);
    if (roomState.isPlaying) {
      const gameStore = useGameStore();
      gameStore.setEtapa('game');
    }
  });

  socket.on('player-removed', () => {
    const sessionStore = useSessionStore();
    const gameStore = useGameStore();
    const roomStore = useRoomStore();
    const publicRoomsStore = usePublicRoomsStore();

    sessionStore.resetState();
    gameStore.resetState();
    roomStore.resetState();
    publicRoomsStore.resetState();

    gameStore.setEtapa('room-selection');
  });

  socket.on('updatePublicRoomList', (publicRooms) => {
    const publicRoomsStore = usePublicRoomsStore();
    publicRoomsStore.setRooms(publicRooms);
  });

  socket.on('join-room-error', (error) => {
    console.error('Error al unirse a la sala:', error.message);
    // Aquí podrías añadir lógica para mostrar el error al usuario,
    // por ejemplo, usando un store de notificaciones o un alert.
    alert(error.message);
  });
}

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

  async updateScore(name, score, roomId) {
    return apiClient.post('/scores', { name, score, roomId });
  },

  async getPublicRoomsList() {
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

  async getRoomDetails(roomId) {
    return apiClient.get(`/rooms/${roomId}`);
  },

  async getPlayersInRoom(roomId) {
    const response = await apiClient.get(`/rooms/${roomId}`);
    return response.data.players;
  },

  async startGame(roomId) {
    return apiClient.post(`/rooms/${roomId}/start`);
  },

  async resetRoom() {
    return apiClient.delete('/rooms');
  },

  async removePlayer(roomId, playerSocketId) {
    return apiClient.delete(`/rooms/${roomId}/player/${playerSocketId}`);
  },

  async makeHost(roomId, targetPlayerSocketId) {
    return apiClient.post(`/rooms/${roomId}/make-host`, { targetPlayerSocketId });
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

  joinRoom(roomId) {
    const sessionStore = useSessionStore();
    const player = { name: sessionStore.playerName, socketId: socket.id, token: sessionStore.token };
    socket.emit('join-room', { roomId, player });
  },

  /**
   * Conecta el socket. Si hay un token, intenta reconectar la sesión.
   * Si no, simplemente conecta. Devuelve el socket.id.
   */
  async connectAndRegister(name) {
    const sessionStore = useSessionStore();
    const existingToken = sessionStore.token;

    this.connect();
    await new Promise((resolve) => {
      if (socket.connected) return resolve();
      socket.once('connect', resolve);
    });

    console.log('Socket conectado con ID:', socket.id);

    // Si hay token, es una reconexión o recarga de página.
    // Si no, es un login nuevo.
    const response = await this.login(name, socket.id, existingToken);

    sessionStore.setPlayerName(response.data.name);

    return response.data;
  },

  sendReadyStatus(isReady) {
    const roomStore = useRoomStore(); // Get roomStore
    socket.emit('set-ready', { roomId: roomStore.roomId, isReady }); // Send roomId
  },

  disconnect() {
    socket.disconnect();
  }
};
