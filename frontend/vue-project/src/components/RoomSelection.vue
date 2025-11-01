<template>
  <div class="room-selection-container">
    <button class="lobby-button logout-button" @click="logoutAndReset">Logout</button>
    <h2>Seleccionar Sala</h2>

    <div class="section">
      <h3>Unirse a una sala existente</h3>
      <input type="text" v-model="joinRoomId" placeholder="ID de la sala" />
      <button @click="joinRoom">Unirse</button>
    </div>

    <div class="section">
      <h3>Salas Públicas</h3>
      <ul v-if="publicRooms.length">
        <li v-for="room in publicRooms" :key="room.id">
          {{ room.name }} (ID: {{ room.id }}) - {{ room.players.length }} jugadores
          <button @click="joinRoomById(room.id)">Unirse</button>
        </li>
      </ul>
      <p v-else>No hay salas públicas disponibles.</p>
      <button @click="fetchPublicRooms">Actualizar Salas</button>
    </div>

    <div class="section">
      <h3>Crear nueva sala</h3>
      <button @click="createRoom">Crear Sala</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { useSessionStore } from '../stores/session';
import { usePublicRoomsStore } from '../stores/publicRooms';
import { communicationManager, socket } from '../communicationManager';

const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();
const publicRoomsStore = usePublicRoomsStore();

const joinRoomId = ref('');
const { rooms: publicRooms } = storeToRefs(publicRoomsStore);

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

const joinRoom = async () => {
  if (!joinRoomId.value) return;
  await joinRoomById(joinRoomId.value);
};

const joinRoomById = (roomId) => {
  try {
    communicationManager.joinRoom(roomId);
    roomStore.setRoomId(roomId);
    sessionStore.setRoomId(roomId);
    gameStore.setEtapa('lobby');
  } catch (error) {
    console.error('Error al unirse a la sala:', error);
    alert('Error al unirse a la sala: ' + (error.response?.data?.message || error.message));
  }
};

const createRoom = () => {
  gameStore.setEtapa('room-settings');
};

const goBackToLogin = () => {
  sessionStore.clearToken();
  sessionStore.clearRoomId();
  gameStore.setEtapa('login');
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

<style scoped>
.room-selection-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  position: relative; /* Added for absolute positioning of back button */
}
.section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #eee;
}
.section:last-child {
  border-bottom: none;
}
input[type="text"] {
  padding: 0.5rem;
  margin-right: 0.5rem;
  width: 200px;
}
button {
  padding: 0.5rem 1rem;
  cursor: pointer;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  background-color: #f9f9f9;
  margin-bottom: 0.5rem;
  padding: 0.8rem;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.back-button {
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-size: 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
}
</style>
