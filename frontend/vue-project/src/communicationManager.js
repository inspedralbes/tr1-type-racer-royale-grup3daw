/**
 * Fichero: communicationManager.js
 * Descripción: Este módulo centraliza toda la comunicación entre el frontend (cliente) y el
 * backend (servidor). Abstrae la lógica de las llamadas a la API REST y la comunicación
 * por WebSockets (usando Socket.IO).
 *
 * Responsabilidades:
 * - Configurar las URLs del API y del socket según el entorno (desarrollo/producción).
 * - Crear una instancia de Axios (`apiClient`) con un interceptor para añadir automáticamente el token de autenticación a las peticiones.
 * - Gestionar la conexión y los eventos de Socket.IO.
 * - Proporcionar un objeto `communicationManager` con métodos claros y concisos para interactuar con el backend.
 */
import axios from 'axios';
import { io } from 'socket.io-client';
import { useSessionStore } from './stores/session';
import { useRoomStore } from './stores/room';
import { useGameStore } from './stores/game';

import { usePublicRoomsStore } from './stores/publicRooms';

let API_BASE_URL;
let SOCKET_URL;

// Vite define `import.meta.env.MODE` como 'production' o 'development'.
// Esto permite configurar las URLs de forma dinámica.
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

// Creación de la instancia de Axios para las peticiones REST.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de peticiones de Axios. Se ejecuta antes de cada petición.
// Su función es añadir el token de autenticación (si existe) a la cabecera `Authorization`.
apiClient.interceptors.request.use((config) => {
  const sessionStore = useSessionStore();
  const token = sessionStore.token;
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Creación de la instancia del cliente de Socket.IO.
// `autoConnect: false` significa que la conexión no se establecerá hasta que se llame a `socket.connect()`.
export const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
});

/**
 * Configura los listeners para los eventos que el servidor puede emitir a través de Socket.IO.
 * Estos listeners actualizan los stores de Pinia correspondientes para mantener la UI sincronizada.
 */
export function setupSocketListeners() {
  // Evento: 'updatePlayerList' - Actualiza la lista de jugadores en la sala.
  socket.on('updatePlayerList', (playerList) => {
    const roomStore = useRoomStore();
    roomStore.setJugadores(playerList);
  });

  // Evento: 'updateRoomState' - Actualiza el estado de la sala (ej. si la partida ha empezado).
  socket.on('updateRoomState', (roomState) => {
    const roomStore = useRoomStore();
    roomStore.setRoomState(roomState);
    // Si el estado indica que el juego está en curso, cambia la etapa del juego.
    if (roomState.isPlaying) {
      const gameStore = useGameStore();
      gameStore.setEtapa('game');
    }
  });

  // Evento: 'player-removed' - Se emite al cliente cuando es expulsado de una sala.
  // Resetea todo el estado local y lo devuelve a la pantalla de selección de sala.
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

  // Evento: 'updatePublicRoomList' - Actualiza la lista de salas públicas disponibles.
  socket.on('updatePublicRoomList', (publicRooms) => {
    const publicRoomsStore = usePublicRoomsStore();
    publicRoomsStore.setRooms(publicRooms);
  });

  // Evento: 'join-room-error' - Maneja errores al intentar unirse a una sala.
  socket.on('join-room-error', (error) => {
    console.error('Error al unirse a la sala:', error.message);
    // Aquí podrías añadir lógica para mostrar el error al usuario,
    // por ejemplo, usando un store de notificaciones o un alert.
    alert(error.message);
  });

  socket.on('join-room-success', (room) => {
    const roomStore = useRoomStore();
    const sessionStore = useSessionStore();
    const gameStore = useGameStore();

    roomStore.setRoomId(room.id);
    roomStore.setRoomState(room);
    sessionStore.setRoomId(room.id);
    gameStore.setEtapa('lobby');
  });
}

// Objeto que agrupa todos los métodos de comunicación con el backend.
export const communicationManager = {
  // --- Métodos de Autenticación y Sesión (REST) ---

  // Obtiene el token de la sesión actual.
  getToken() {
    const sessionStore = useSessionStore();
    return sessionStore.token;
  },

  setToken(token) {
    const sessionStore = useSessionStore();
    sessionStore.setToken(token);
  },

  // Realiza el login o registro en el backend.
  async login(name, socketId) {
    const token = this.getToken();
    const response = await apiClient.post('/login', { name, socketId, token });
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response;
  },

  // --- Métodos de Juego (REST) ---

  // Obtiene la lista de palabras para la partida.
  async getWords() {
    return apiClient.get('/words');
  },

  // Actualiza la puntuación de un jugador durante la partida.
  async updateScore(name, score, roomId) {
    return apiClient.post('/scores', { name, score, roomId });
  },

  // --- Métodos de Salas (REST) ---

  // Obtiene la lista de salas públicas.
  async getPublicRoomsList() {
    return apiClient.get('/rooms');
  },

  // Crea una nueva sala.
  async createRoom(roomSettings) {
    const sessionStore = useSessionStore();
    const hostPlayer = { name: sessionStore.playerName, socketId: socket.id, token: sessionStore.token };
    return apiClient.post('/rooms', { ...roomSettings, hostPlayer });
  },

  // Actualiza la configuración de una sala existente.
  async updateRoom(roomId, roomSettings) {
    return apiClient.put(`/rooms/${roomId}`, roomSettings);
  },

  // Obtiene los detalles de una sala específica.
  async getRoomDetails(roomId) {
    return apiClient.get(`/rooms/${roomId}`);
  },

  // Obtiene la lista de jugadores en una sala.
  async getPlayersInRoom(roomId) {
    const response = await apiClient.get(`/rooms/${roomId}`);
    return response.data.players;
  },

  // Envía la señal para iniciar la partida en una sala.
  async startGame(roomId) {
    return apiClient.post(`/rooms/${roomId}/start`);
  },

  // (Obsoleto/No usado) Resetea una sala.
  async resetRoom() {
    return apiClient.delete('/rooms');
  },

  async removePlayer(roomId, playerSocketId) {
    return apiClient.delete(`/rooms/${roomId}/player/${playerSocketId}`);
  },

  // Transfiere el rol de host a otro jugador.
  async makeHost(roomId, targetPlayerSocketId) {
    return apiClient.post(`/rooms/${roomId}/make-host`, { targetPlayerSocketId });
  },

  // Resetea el estado de "listo" de todos los jugadores en la sala.
  async resetReadyStatus(roomId) {
    return apiClient.post(`/rooms/${roomId}/reset-ready-status`);
  },

  // Informa al backend de la página/etapa actual del jugador.
  async updatePlayerPage(page) {
    const token = this.getToken();
    if (token) {
      return apiClient.post('/player/page', { token, page });
    }
    return Promise.resolve();
  },

  // --- Métodos de Socket.IO ---

  // Conecta el socket si no está ya conectado.
  connect() {
    if (!socket.connected) socket.connect();
  },

  // Emite el evento para unirse a una sala.
  joinRoom(roomId) {
    const sessionStore = useSessionStore();
    const player = { name: sessionStore.playerName, socketId: socket.id, token: sessionStore.token };
    socket.emit('join-room', { roomId, player });
  },

  /**
   * Proceso combinado de conexión y registro.
   * 1. Asegura que el socket esté conectado.
   * 2. Llama al endpoint de login/registro del backend, que gestiona tanto nuevos jugadores como reconexiones.
   * 3. Devuelve los datos del jugador recibidos del backend.
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

    // Llama al método de login, pasando el token existente si lo hay.
    // El backend se encargará de la lógica de si es un login nuevo o una reconexión.
    const response = await this.login(name, socket.id, existingToken);

    sessionStore.setPlayerName(response.data.name);
    return response.data;
  },

  // Emite el evento para cambiar el estado de "listo" del jugador.
  sendReadyStatus(isReady) {
    const roomStore = useRoomStore(); // Get roomStore
    socket.emit('set-ready', { roomId: roomStore.roomId, isReady }); // Send roomId
  },

  // Desconecta el socket.
  disconnect() {
    socket.disconnect();
  }
};
