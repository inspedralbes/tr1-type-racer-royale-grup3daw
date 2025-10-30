// src/communicationManager.js
import axios from 'axios';
import { io } from 'socket.io-client';

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
  async login(name, socketId) {
    // ahora enviamos ambos datos al servidor
    return apiClient.post('/login', { name, socketId });
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

  async startGame() {
    return apiClient.post('/rooms/start');
  },

  async resetRoom() {
    return apiClient.delete('/rooms');
  },

  async removePlayer(playerSocketId, hostSocketId) {
    return apiClient.delete(`/rooms/player/${playerSocketId}`, { data: { hostSocketId } });
  },

  async makeHost(currentHostSocketId, targetPlayerSocketId) {
    return apiClient.post('/rooms/make-host', { currentHostSocketId, targetPlayerSocketId });
  },

  // --- SOCKET ---
  connect() {
    if (!socket.connected) socket.connect();
  },

  /** Conecta y registra al jugador, devuelve socket.id */
  async connectAndRegister(playerName) {
    this.connect();

    await new Promise((resolve) => {
      if (socket.connected) return resolve();
      socket.once('connect', resolve);
    });

    socket.emit('register', playerName);

    console.log('Jugador registrado con socket ID:', socket.id);
    return socket.id;
  },

  onUpdatePlayerList(callback) {
    socket.off('updatePlayerList');
    socket.on('updatePlayerList', callback);
  },

  onUpdateRoomState(callback) {
    socket.off('updateRoomState');
    socket.on('updateRoomState', callback);
  },

  onPlayerRemoved(callback) {
    socket.off('player-removed');
    socket.on('player-removed', callback);
  },

  sendReadyStatus(isReady) {
    socket.emit('set-ready', isReady);
  },

  disconnect() {
    socket.disconnect();
  }
};
