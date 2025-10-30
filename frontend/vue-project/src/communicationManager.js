// src/managers/CommunicationManager.js
import axios from 'axios';
import { io } from 'socket.io-client';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const socket = io('http://localhost:3000', {
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

  disconnect() {
    socket.disconnect();
  }
};
