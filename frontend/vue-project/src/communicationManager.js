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
 * - Proporcionar un objeto `communicationManager` con métodos claros y concisos para interactuar con el backend
 */
import axios from 'axios';
import { io } from 'socket.io-client';
import { useSessionStore } from './stores/session';
import { useRoomStore } from './stores/room';
import { useGameStore } from './stores/game';
import { useRouter } from 'vue-router';

import { usePublicRoomsStore } from './stores/publicRooms';
import { useNotificationStore } from './stores/notification';

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

// Interceptor de respuestas de Axios. Se ejecuta después de recibir cada respuesta.
// Ideal para manejar errores de API de forma centralizada.
apiClient.interceptors.response.use(
  (response) => response, // Si la respuesta es exitosa (2xx), no hace nada.
  (error) => {
    // Si hay un error en la respuesta.
    console.error('Error en la llamada API:', error.response?.data?.message || error.message);
    
    try {
      const notificationStore = useNotificationStore();
      // Solo mostramos notificación si no es un 404 de updatePlayerPage (caso especial manejado)
      if (!(error.config.url === '/player/page' && error.response?.status === 404)) {
        notificationStore.pushNotification({ 
          type: 'error', 
          message: error.response?.data?.message || 'Error de conexión con el servidor'
        });
      }
    } catch (e) {
      console.warn('Could not show error notification:', e);
    }
    
    // Rechaza la promesa para que el .catch() en el lugar de la llamada original aún pueda ejecutarse si es necesario.
    return Promise.reject(error);
  }
);

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
export function setupSocketListeners(router) {
  const gameStore = useGameStore();
  const sessionStore = useSessionStore();
  // Evento: 'updatePlayerList' - Actualiza la lista de jugadores en la sala.
  socket.on('updatePlayerList', (playerList) => {
    console.log('updatePlayerList event received:', playerList);
    const roomStore = useRoomStore();
    // Normalize player objects to guarantee the `disconnected` flag is present and boolean.
    const normalized = (playerList || []).map(p => ({
      name: p.name,
      score: p.score ?? 0,
      role: p.role ?? 'player',
      socketId: p.socketId,
      isReady: !!p.isReady,
      token: p.token,
      disconnected: !!p.disconnected,
      avatar: p.avatar,
      color: p.color,
      isGuest: !!p.isGuest,
    }));
    roomStore.setJugadores(normalized);
  });

  // Evento: 'updateRoomState' - Actualiza el estado de la sala (ej. si la partida ha empezado).
  socket.on('updateRoomState', (roomState) => {
    console.log('updateRoomState event received:', roomState);
    const roomStore = useRoomStore();
    roomStore.setRoomState(roomState);
    // Si el estado indica que el juego está en curso, cambia la etapa del juego.
    if (roomState.isPlaying) {
      // En lugar de navegar directamente, cambiamos la etapa en el store.
      // GameEngine se encargará de mostrar el componente Joc.
      sessionStore.setEtapa('game');
    }
  });

  // Evento: 'player-removed' - Se emite al cliente cuando es expulsado de una sala.
  // Resetea todo el estado local y lo devuelve a la pantalla de selección de sala.
  socket.on('player-removed', (data) => {
    if (data.socketId === socket.id) {
      const sessionStore = useSessionStore();
      const gameStore = useGameStore();
      const roomStore = useRoomStore();
      const publicRoomsStore = usePublicRoomsStore();

      // Limpia el sessionStorage y resetea los stores
      sessionStore.clearSession(); // Corregido: La función en stores/session.js se llama clearSession.
      gameStore.resetState();
      roomStore.resetState();
      publicRoomsStore.resetState();

      // router.push('/rooms'); // Eliminado, GameEngine gestiona la vista
    }
  });

  // Evento: 'updatePublicRoomList' - Actualiza la lista de salas públicas disponibles.
  socket.on('updatePublicRoomList', (publicRooms) => {
    const publicRoomsStore = usePublicRoomsStore();
    publicRoomsStore.setRooms(publicRooms);
  });

  // Evento: 'join-room-error' - Maneja errores al intentar unirse a una sala.
  socket.on('join-room-error', (error) => {
    console.error('Error al unirse a la sala:', error.message);
    // Use notification store instead of alert for visual feedback
    try {
      const notificationStore = useNotificationStore();
      notificationStore.pushNotification({ type: 'error', message: `Error al unirse a la sala: ${error.message}` });
    } catch (e) {
      console.warn('Could not push notification for join-room-error', e);
    }
  });

  socket.on('join-room-success', (room) => {
    const roomStore = useRoomStore();
    const sessionStore = useSessionStore();

    // Actualiza el estado local con los datos recibidos ANTES de redirigir.
    // Esto asegura que el lobby tenga la información correcta desde el principio.
    roomStore.setRoomId(room.id);
    roomStore.setRoomState(room);
    sessionStore.setRoomId(room.id);
    roomStore.setJugadores(room.players); // ¡Esta es la línea clave!
    // En lugar de navegar directamente, cambiamos la etapa en el store.
    sessionStore.setEtapa('lobby');
    // Informar al usuario que se unió correctamente
    try {
      const notificationStore = useNotificationStore();
      notificationStore.pushNotification({ type: 'success', message: `Te has unido a la sala ${room.name || room.id}` });
    } catch (e) {
      // ignore
    }
    // router.push('/lobby'); // Redirige al lobby - Eliminado, GameEngine gestiona la vista
  });
}

// Objeto que agrupa todos los métodos de comunicación con el backend.
export const communicationManager = {
  // --- Métodos de Autenticación y Sesión (REST) ---

  // Login como invitado
  async loginAsGuest(username) {
    return apiClient.post('/auth/login-as-guest', { username });
  },

  async register(username, email, password) {
    return apiClient.post('/auth/register', { username, email, password });
  },

  async login(email, password) {
    return apiClient.post('/auth/login', { email, password });
  },

  // --- User profile ---
  async getCurrentUser() {
    return apiClient.get('/user/me');
  },

  async updateCurrentUser(payload) {
    return apiClient.put('/user/me', payload);
  },

  async deleteAccount() {
    return apiClient.delete('/user/me');
  },



  // Obtiene el token de la sesión actual.
  getToken() {
    const sessionStore = useSessionStore();
    return sessionStore.token;
  },

  setToken(token) {
    const sessionStore = useSessionStore();
    sessionStore.setToken(token);
  },

  // Emite un evento para notificar al backend que el usuario ha cerrado sesión voluntariamente.
  logout() {
    const sessionStore = useSessionStore();
    const token = sessionStore.token;
    if (token) {
      socket.emit('explicit-logout', token);
    }
    // Limpia la sesión localmente después de notificar al backend.
    sessionStore.clearSession();
  },

  // Desconecta el socket y elimina cualquier auth pendiente (no notifica al servidor).
  disconnect() {
    try {
      if (socket && socket.connected) {
        socket.disconnect();
      }
      // Clear any auth attached so future connects don't reuse an old token
      if (socket) socket.auth = {};
    } catch (e) {
      console.warn('Error while disconnecting socket:', e);
    }
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

  // Guarda el resultado final de la partida en el backend.
  async saveGameResult(playerName, score, wpm) {
    return apiClient.post('/scores/save', { playerName, score, wpm });
  },

  // Obtiene estadísticas agregadas de los jugadores.
  async getPlayerStats() {
    return apiClient.get('/stats/player');
  },

  // Obtiene el historial de WPM de un jugador.
  async getPlayerScoreHistory(playerName) {
    return apiClient.get(`/scores/history/${playerName}`);
  },

  async sendGameStats(stats) {
    return apiClient.post('/stats/game', stats);
  },

  // --- Métodos de Salas (REST) ---

  // Obtiene la lista de salas públicas.
  async getPublicRoomsList() {
    return apiClient.get('/rooms');
  },

  // Crea una nueva sala.
  async createRoom(roomSettings) {
    await this.waitUntilConnected();
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

  // Envía la señal para iniciar la partida en una sala.
  async startGame(roomId) {
    return apiClient.post(`/rooms/${roomId}/start`);
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
    if (!token) return Promise.resolve();

    // Ensure the socket is connected first — the server registers players on socket connect.
    try {
      await this.waitUntilConnected();
    } catch (e) {
      // If connection fails or times out, still attempt the REST call, but handle errors below.
      console.warn('Socket not connected before updatePlayerPage; proceeding with REST call:', e);
    }

    try {
      return await apiClient.post('/player/page', { token, page });
    } catch (err) {
      // If the server responds 404 it means the player is not yet registered on the server-side
      // (e.g., socket connection/registration hasn't completed). Don't throw to avoid unhandled
      // watcher errors — just log and swallow the error.
      if (err.response && err.response.status === 404) {
        console.warn('updatePlayerPage: player not found on server yet (404). Ignoring.');
        return Promise.resolve();
      }
      // Re-throw other errors so callers can handle them.
      throw err;
    }
  },

  // Espera hasta que el socket esté conectado.
  async waitUntilConnected() {
    if (socket.connected) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      socket.once('connect', resolve);
    });
  },

  // Emite el estado de "listo" del jugador a la sala.
  sendReadyStatus(isReady) {
    const roomStore = useRoomStore();
    socket.emit('set-ready', { roomId: roomStore.roomId, isReady });
  },

  // --- Power-Up Methods (Socket.IO) ---

  sendPowerUp(powerUpData) {
    socket.emit('powerUp', powerUpData);
  },

  onReceivePowerUp(callback) {
    socket.on('receivePowerUp', callback);
  },

  offReceivePowerUp(callback) {
    socket.off('receivePowerUp', callback);
  },

  // --- Métodos de Socket.IO ---

  // Emite el evento para unirse a una sala.
  joinRoom(roomId) {
    this.waitUntilConnected().then(() => {
      const sessionStore = useSessionStore();
      const player = { name: sessionStore.playerName, socketId: socket.id, token: sessionStore.token };
      socket.emit('join-room', { roomId, player });
    });
  },

  /**
   * Conecta el socket al servidor.
   * El token de autenticación se obtiene del sessionStore y se adjunta
   * automáticamente para que el backend pueda identificar al usuario.
   */
  connect() {
    const sessionStore = useSessionStore();
    if (!socket.connected) {
      // Adjunta el token al objeto 'auth' del socket antes de conectar.
      // El backend lo recibirá en el evento 'connection'.
      socket.auth = { token: sessionStore.token };
      socket.connect();
    }
  },

  /**
   * Proceso combinado de conexión y registro.
   * 1. Asegura que el socket esté conectado.
   * 2. Llama al endpoint de login/registro del backend, que gestiona tanto nuevos jugadores como reconexiones.
   * 3. Devuelve los datos del jugador recibidos del backend.
   */
  async connectAndRegister(username) {
    // La conexión del socket y el envío del token ya se gestionan en el flujo de login/reconexión.
    // Esta función ahora solo necesita establecer el nombre del jugador en el estado local.
    const sessionStore = useSessionStore();

    sessionStore.setPlayerName(username);
    // No es necesario devolver nada, ya que el estado se gestiona a través de Pinia.
    return { name: username };
  },
};