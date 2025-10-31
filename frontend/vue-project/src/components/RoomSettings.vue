<template>
  <div class="room-settings-container">
    <h2>Configuración de la Sala</h2>
    <form @submit.prevent="saveSettings">
      <div class="form-group" v-if="room.id">
        <label for="roomId">ID de la Sala</label>
        <input type="text" id="roomId" :value="room.id" disabled>
      </div>
      <div class="form-group">
        <label for="roomName">Nombre de la Sala</label>
        <input type="text" id="roomName" v-model="room.name" :disabled="!!room.id" required>
      </div>
      <div class="form-group">
        <label for="isPublic">Visibilidad</label>
        <select id="isPublic" v-model="room.isPublic">
          <option :value="true">Pública</option>
          <option :value="false">Privada</option>
        </select>
      </div>
      <div class="form-group">
        <label for="gameMode">Modo de Juego</label>
        <select id="gameMode" v-model="room.gameMode">
          <option value="normal">Normal</option>
        </select>
      </div>
      <div class="form-group">
        <label for="gameTime">Tiempo de Juego (segundos)</label>
        <input type="number" id="gameTime" v-model.number="room.time" min="30" max="120" required>
      </div>
      <div class="form-actions">
        <button type="submit">Guardar</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoomStore } from '../stores/room';
import { useGameStore } from '../stores/game';
import { useSessionStore } from '../stores/session'; // Import session store
import { communicationManager } from '../communicationManager';

const roomStore = useRoomStore();
const gameStore = useGameStore();
const sessionStore = useSessionStore(); // Use session store

const room = ref({
  name: sessionStore.playerName ? `${sessionStore.playerName}'s Room` : 'Mi Sala', // Set default name
  isPublic: true,
  gameMode: 'normal',
  time: 60,
});

// Si estamos editando una sala existente, cargamos sus datos
onMounted(() => {
  if (roomStore.room) {
    room.value = { ...roomStore.room };
  }
});

const saveSettings = async () => {
  try {
    if (roomStore.room && roomStore.room.id) {
      // Actualizar sala existente
      const response = await communicationManager.updateRoom(roomStore.room.id, room.value);
      roomStore.setRoom(response.data); // Update roomStore.room with the latest data
    } else {
      // Crear nueva sala
      const newRoom = await communicationManager.createRoom(room.value);
      roomStore.setRoom(newRoom.data);
    }
    gameStore.setEtapa('lobby');
  } catch (error) {
    console.error('Error al guardar la configuración de la sala:', error);
    alert('Error al guardar la configuración.');
  }
};
</script>

<style scoped>
.room-settings-container {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
}
input[type="text"],
input[type="number"] {
  width: 100%;
  padding: 0.5rem;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
