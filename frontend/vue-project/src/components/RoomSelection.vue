<template>
  <div class="main-background">
    <div class="themed-container room-selection-container">
      <h2>Seleccionar Sala</h2>

      <div class="section">
        <h3>Unirse a una sala existente</h3>
        <input type="text" v-model="joinRoomId" placeholder="ID de la sala" />
        <button class="btn btn-small" @click="joinRoom">Unirse</button>
      </div>

      <div class="section">
        <h3>Salas Públicas</h3>
        <ul class="roomList" v-if="publicRooms.length">
          <li class="room" v-for="room in publicRooms" :key="room.id">
            {{ room.name }} (ID: {{ room.id }}) - {{ room.players.length }} jugadores
            <button class="btn btn-small" @click="joinRoomById(room.id)">Unirse</button>
          </li>
        </ul>
        <p v-else>No hay salas públicas disponibles.</p>
        <button class="btn btn-small" @click="fetchPublicRooms">Actualizar Salas</button>
      </div>

      <div class="section">
        <h3>Crear nueva sala</h3>
        <button class="btn" @click="createRoom">Crear Sala</button>
      </div>
      <button class="btn logout-button" @click="logoutAndReset">Logout</button>
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

import { useRouter } from 'vue-router';

// Inicialización de los stores de Pinia.
const router = useRouter();
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
onMounted(async () => {
  await communicationManager.updatePlayerPage('rooms');
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
  sessionStore.setEtapa('room-settings');
};

/**
 * Gestiona el proceso completo de cierre de sesión.
 * 1. Emite un evento 'explicit-logout' al backend con el token del jugador para que el servidor
 *    pueda limpiar el estado del jugador inmediatamente.
 * 2. Desconecta el socket.
 * 3. Resetea el estado de todos los stores de Pinia a sus valores iniciales.
 * 4. Cambia la etapa del juego de vuelta a 'login'.
 */
const logoutAndReset = () => {
  // Llama al método centralizado de logout que notifica al backend y limpia la sesión.
  communicationManager.logout();

  // Disconnect the socket after emitting the logout event
  socket.disconnect();
  
  // Resetea los stores de estado del juego y de las salas.
  gameStore.resetState();
  roomStore.resetState();
  publicRoomsStore.resetState();

  router.push('/login');
};
</script>

<style src="../styles/styleRoomSelection.css">

</style>
