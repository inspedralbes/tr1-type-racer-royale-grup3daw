<template>
  <div class="room-selection-container">
    <button class="back-button" @click="goBackToLogin">←</button>
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
import { ref, onMounted } from 'vue';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { useSessionStore } from '../stores/session';
import { communicationManager, socket } from '../communicationManager';

const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();

const joinRoomId = ref('');
const publicRooms = ref([]);

onMounted(() => {
  fetchPublicRooms();
  communicationManager.onUpdatePublicRoomList((updatedList) => {
    publicRooms.value = updatedList;
  });
});

const fetchPublicRooms = async () => {
  try {
    const response = await communicationManager.getPublicRooms();
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

const joinRoomById = async (roomId) => {
  try {
    const player = { name: sessionStore.playerName, socketId: socket.id, token: sessionStore.token };
    const response = await communicationManager.joinRoom(roomId, player);
    roomStore.setRoom(response.data);
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
