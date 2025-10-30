import axios from 'axios';
import io from 'socket.io-client';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

const socket = io('http://localhost:3000');

export const communicationManager = {
  // API REST Endpoints
  login(name) {
    return apiClient.post('/login', { name });
  },

  getWords() {
    return apiClient.get('/words');
  },

  updateScore(name, score) {
    return apiClient.post('/scores', { name, score });
  },

  // Socket.IO Events
  register(playerName) {
    socket.emit('register', playerName);
  },

  onUpdatePlayerList(callback) {
    socket.on('updatePlayerList', callback);
  },

  disconnect() {
    socket.disconnect();
  }
};