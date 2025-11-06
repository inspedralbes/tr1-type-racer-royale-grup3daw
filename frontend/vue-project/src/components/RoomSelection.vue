<template>
  <div class="selection-background">
    <div class="room-selection-container">
      <!--
        Este componente es el "hub" principal después del login. Ofrece al usuario tres opciones:
        1. Unirse a una sala existente introduciendo su ID.
        2. Ver una lista de salas públicas y unirse a una de ellas.
        3. Crear una nueva sala, lo que le llevará a la pantalla de configuración (`RoomSettings`).
        También incluye un botón de "Logout" para cerrar la sesión.
      -->
      <h2>Seleccionar Sala</h2>

      <div class="section">
        <h3>Unirse a una sala existente</h3>
        <input type="text" v-model="joinRoomId" placeholder="ID de la sala" />
        <button class="joinId-button" @click="joinRoom">Unirse</button>
      </div>

      <div class="section">
        <h3>Salas Públicas</h3>
        <ul class="roomList" v-if="publicRooms.length">
          <li class="room" v-for="room in publicRooms" :key="room.id">
            {{ room.name }} (ID: {{ room.id }}) - {{ room.players.length }} jugadores
            <button class="joinPublic-button" @click="joinRoomById(room.id)">Unirse</button>
          </li>
        </ul>
        <p v-else>No hay salas públicas disponibles.</p>
        <button class="actualizar-button" @click="fetchPublicRooms">Actualizar Salas</button>
      </div>

      <div class="section">
        <h3>Crear nueva sala</h3>
        <button class="create-room-button" @click="createRoom">Crear Sala</button>
        <button class="stats-button" @click="goToPlayerStats">Ver Estadísticas</button>
      </div>

      <div class="room-list">
        <button class="logout-button" @click="logoutAndReset">Logout</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Fichero: RoomSelection.vue
 * Descripción: Este componente permite a los usuarios navegar, unirse o crear salas de juego.
 *
 * Funcionalidades:
 * - Al montarse, obtiene y muestra una lista de las salas públicas disponibles.
 * - Permite al usuario unirse a una sala específica por su ID.
 * - Permite al usuario unirse a una sala directamente desde la lista de salas públicas.
 * - Redirige al usuario a la vista `RoomSettings` para crear una nueva sala.
 * - Gestiona el cierre de sesión (logout), limpiando todo el estado local (stores de Pinia, sessionStorage)
 *   y notificando al backend para que también limpie el estado del jugador.
 */
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { useSessionStore } from '../stores/session';
import { usePublicRoomsStore } from '../stores/publicRooms';
import { communicationManager, socket } from '../communicationManager';

// Inicialización de los stores de Pinia.
const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();
const publicRoomsStore = usePublicRoomsStore();

// `joinRoomId` almacena el valor del campo de texto para unirse por ID.
const joinRoomId = ref('');
// `publicRooms` es una referencia reactiva a la lista de salas del store.
const { rooms: publicRooms } = storeToRefs(publicRoomsStore);

/**
 * Hook `onMounted`: Se ejecuta al montar el componente y llama a la función
 * para obtener la lista de salas públicas.
 */
onMounted(() => {
  fetchPublicRooms();
});

const fetchPublicRooms = async () => {
  try {
    const response = await communicationManager.getPublicRoomsList();
    publicRooms.value = response.data;
  } catch (error) {
    console.error('Error al obtener salas públicas:', error);
    alert('Error al obtener salas públicas.');
  }
};

const joinRoom = () => {
  if (!joinRoomId.value) return;
  joinRoomById(joinRoomId.value);
};

/**
 * Lógica para unirse a una sala.
 * - Llama a `communicationManager.joinRoom` para emitir el evento de socket.
 * - Actualiza los stores de `roomStore` y `sessionStore` con el ID de la sala.
 * - Cambia la etapa del juego a 'lobby' para mostrar la sala de espera.
 */
const joinRoomById = (roomId) => {
  communicationManager.joinRoom(roomId);
};

/**
 * Cambia la etapa del juego a 'room-settings' para que se muestre el componente de configuración de sala.
 */
const createRoom = () => {
  gameStore.setEtapa('room-settings');
};

const goToPlayerStats = () => {
  gameStore.setEtapa('player-stats');
};

const logoutAndReset = () => {
  // Emit explicit-logout with the player's token to ensure backend cleanup
  if (sessionStore.token) {
    socket.emit('explicit-logout', sessionStore.token);
  }
  // Disconnect the socket after emitting the logout event
  socket.disconnect();
  
  sessionStore.resetState();
  gameStore.resetState();
  roomStore.resetState();
  publicRoomsStore.resetState();

  gameStore.setEtapa('login');
};
</script>

<style src="../styles/styleRoomSelection.css">

</style>
