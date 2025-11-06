<template>
  <div class="main-background">
    <div class="themed-container room-settings-container">
      <h2>Configuración de la Sala</h2>
      <form @submit.prevent="saveSettings">
        <div class="form-group" v-if="room.id">
          <label for="roomId">ID de la Sala: </label>
          <input type="text" id="roomId" :value="room.id" disabled>
        </div>
        <div class="form-group">
          <label for="roomName">Nombre de la Sala: </label>
          <input type="text" id="roomName" v-model="room.name" :disabled="!!room.id" required>
        </div>
        <div class="form-group">
          <label for="isPublic">Visibilidad:</label>
          <select id="isPublic" v-model="room.isPublic">
            <option :value="true">Pública</option>
            <option :value="false">Privada</option>
          </select>
        </div>
        <div class="form-group">
          <label for="gameMode">Modo de Juego (obligatorio):</label>
          <select id="gameMode" v-model="room.gameMode" required>
            <option value="" disabled>-- Elige un modo de juego --</option>
            <option value="cuentaAtrasSimple">Cuenta Atrás Simple</option>
            <option value="modoJuego2">Modo de Juego 2</option>
            <option value="modoJuego3">Modo de Juego 3</option>
          </select>
          <div v-if="validationError" class="validation-error">{{ validationError }}</div>
        </div>
        
        <div class="form-group">
          <label for="gameTime">Tiempo de Juego (segundos):</label>
          <input type="number" id="gameTime" v-model.number="room.time" min="30" max="120" required>
        </div>
        <div class="form-actions">
          <button class="btn" type="submit">Guardar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * Fichero: RoomSettings.vue
 * Descripción: Este componente gestiona la interfaz y la lógica para crear o modificar
 * la configuración de una sala de juego.
 *
 * Funcionalidades:
 * - Presenta un formulario con opciones como nombre de la sala, visibilidad (pública/privada),
 *   modo de juego y tiempo de la partida.
 * - Si se accede para editar una sala existente (el `roomStore` tiene datos), precarga el
 *   formulario con la configuración actual de esa sala.
 * - Si se accede para crear una sala nueva, inicializa el formulario con valores por defecto.
 * - Al guardar, llama al método correspondiente del `communicationManager` (`createRoom` o `updateRoom`)
 *   y redirige al usuario al lobby de la sala.
 */
import { ref, onMounted, watch } from 'vue';
import { useRoomStore } from '../stores/room';
import { useGameStore } from '../stores/game';
import { useSessionStore } from '../stores/session';
import { communicationManager } from '../communicationManager';
import { useRouter } from 'vue-router';

// Inicialización de los stores de Pinia.
const roomStore = useRoomStore();
const gameStore = useGameStore();
const sessionStore = useSessionStore();
const router = useRouter();

// `room` es una referencia reactiva que contiene los datos del formulario.
// Se inicializa con valores por defecto, usando el nombre del jugador para el nombre de la sala.
const room = ref({
  name: sessionStore.playerName ? `${sessionStore.playerName}'s Room` : 'Mi Sala',
  isPublic: true,
  gameMode: '',
  time: 60,
});

const validationError = ref('');

/**
 * Hook `onMounted`: Se ejecuta cuando el componente se monta.
 * Comprueba si ya existe una sala en el `roomStore`. Si es así, significa que estamos
 * editando una sala existente, por lo que copia sus datos al `ref` local `room`.
 */
onMounted(async () => {
  await communicationManager.updatePlayerPage('room-settings');
  if (roomStore.room && roomStore.room.id) {
    room.value = { ...roomStore.room };
  }
});

const saveSettings = async () => {
  try {
    // Validación: el campo 'gameMode' es obligatorio para crear/actualizar la sala
    if (!room.value.gameMode) {
      validationError.value = 'Debes elegir un modo de juego antes de guardar la sala.';
      return;
    }
    validationError.value = '';

    if (roomStore.room && roomStore.room.id) {
      // Si la sala ya tiene un ID, significa que estamos actualizando una sala existente.
      const response = await communicationManager.updateRoom(roomStore.room.id, room.value);
      roomStore.setRoom(response.data); // Actualiza el store con los nuevos datos.
      sessionStore.setEtapa('lobby'); // Establece la etapa a 'lobby'
    } else {
      // Si no hay ID, estamos creando una nueva sala.
      const newRoom = await communicationManager.createRoom(room.value);
      // Guarda la nueva sala en el store.
      roomStore.setRoom(newRoom.data);
      // Guarda el ID de la sala en la sesión para persistencia.
      sessionStore.setRoomId(newRoom.data.id);
      // Se une a la sala recién creada a través del socket.
      communicationManager.joinRoom(newRoom.data.id);
      sessionStore.setEtapa('lobby'); // Establece la etapa a 'lobby'
    }
  } catch (error) {
    console.error('Error al guardar la configuración de la sala:', error);
    alert('Error al guardar la configuración.');
  }
};
</script>

<style src="../styles/styleRoomCreator.css"></style>
