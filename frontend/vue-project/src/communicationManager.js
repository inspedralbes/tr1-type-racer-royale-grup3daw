// src/communicationManager.js
import axios from 'axios';
import { io } from 'socket.io-client';

// Determinar las URLs base según el entorno (Vite)
const isProduction = import.meta.env.PROD;

// En producción, la URL de la API es relativa (ej: /api) para que el proxy (Nginx) la gestione.
// El socket se conecta al mismo host desde el que se sirve el frontend.
// En desarrollo, apuntamos directamente al backend en localhost:3000.
const API_BASE_URL = isProduction ? import.meta.env.VITE_API_URL || '/api' : 'http://localhost:3000/api';
const SOCKET_URL = isProduction ? window.location.origin : 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const socket = io(SOCKET_URL, {
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

  disconnect() {
    socket.disconnect();
  }
};
