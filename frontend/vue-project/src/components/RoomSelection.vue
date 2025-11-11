<template>
  <div class="selection-background">
    <div class="centra-console-panel">
      <div class="selection hologram">
        <button class="btn-profile-top" v-if="sessionStore.email" @click="goToProfile" style="margin-left:8px">Profile</button>
        <div class="section-joinID">
          <h3>Unirse a una sala existente</h3>
          <input type="text" v-model="joinRoomId" placeholder="ID de la sala" />
          <button class="btn btn-small" @click="joinRoom">Unirse</button>
        </div>

        <div class="section-joinPublic">
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

        <div class="section-create">
          <h3>Crear nueva sala</h3>
          <button class="btn" @click="createRoom">Crear Sala</button>
        </div>
        <div style="margin-top:12px">
          <button class="btn" v-if="sessionStore.email" @click="goToPlayerStats">Ver Estadísticas</button>
          <button class="btn logout-button" @click="logoutAndReset" style="margin-left:8px">Logout</button>
        </div>
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
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { useSessionStore } from '../stores/session';
import { usePublicRoomsStore } from '../stores/publicRooms';
import { communicationManager, socket } from '../communicationManager';
import { useNotificationStore } from '../stores/notification';

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
  fetchPublicRooms();
});

const fetchPublicRooms = async () => {
  try {
    const response = await communicationManager.getPublicRoomsList();
    publicRoomsStore.setRooms(response.data);
  } catch (error) {
    console.error('Error al obtener salas públicas:', error);
    const notificationStore = useNotificationStore();
    notificationStore.pushNotification({ type: 'error', message: 'Error al obtener salas públicas.' });
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
 * - Navega al lobby de la sala.
 */
const joinRoomById = (roomId) => {
  communicationManager.joinRoom(roomId);
  sessionStore.setRoomId(roomId);
  sessionStore.setEtapa('lobby');
};

/**
 * Navega a la pantalla de configuración de sala para crear una nueva sala.
 */
const createRoom = () => {
  sessionStore.setEtapa('room-settings');
  router.push('/game/room-settings');
};

const goToPlayerStats = () => {
  router.push('/stats');
};

const logoutAndReset = () => {
  // Llama al método centralizado de logout que notifica al backend y limpia la sesión.
  communicationManager.logout();

  // Disconnect the socket after emitting the logout event
  if (socket) {
    socket.disconnect();
  }
  
  // Resetea los stores de estado del juego y de las salas.
  gameStore.resetState();
  roomStore.resetState();
  publicRoomsStore.resetState();
  sessionStore.clearSession();

  router.push('/login');
};

const goToProfile = () => {
  router.push('/profile');
}
</script>

<style src="../styles/styleRoomSelection.css">

</style>
