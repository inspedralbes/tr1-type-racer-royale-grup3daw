<template>
  <div class="login-background">
    <div class="centra-console-panel">
      <div class="login-container hologram room-settings-container">
        <h2>Configuración de la Sala</h2>
        <form @submit.prevent="saveSettings">
          
          <div class="form-group" v-if="room.id">
            <label for="roomId">ID de la Sala:</label>
            <input type="text" id="roomId" :value="room.id" disabled>
          </div>
          <div class="form-group">
            <label for="roomName">Nombre de la Sala:</label>
            <input type="text" id="roomName" v-model="room.name" :disabled="!!room.id" required>
          </div>
          <div class="form-group">
            <label for="isPublic">Visibilidad:</label>
            
            <div class="custom-select" :class="{ 'open': isPublicOpen }" ref="publicSelectRef">
              <button type="button" class="select-trigger" @click.stop="togglePublic">
                {{ room.isPublic ? 'Pública' : 'Privada' }}
              </button>
              <div class="select-options">
                <div class="select-option" @click="selectPublic(true)">Pública</div>
                <div class="select-option" @click="selectPublic(false)">Privada</div>
              </div>
            </div>
            
          </div>
          <div class="form-group">
            <label for="gameMode">Modo de Juego:</label>
            
            <div class="custom-select" :class="{ 'open': isGameModeOpen }" ref="gameModeSelectRef">
              <button type="button" class="select-trigger" @click.stop="toggleGameMode">
                {{ getGameModeName(room.gameMode) }}
              </button>
              <div class="select-options">
                <div v-for="mode in gameModes" :key="mode.value" 
                     class="select-option" @click="selectGameMode(mode.value)">
                  {{ mode.name }}
                </div>
              </div>
            </div>

          </div>
          
          <div v-if="validationError" class="validation-error" style="color: #FF4141; text-shadow: 0 0 5px #FF4141; margin-bottom: 10px;">
            {{ validationError }}
          </div>
          
          <div class="form-group">
            <label for="gameTime">Tiempo (segundos):</label>
            <div class="custom-number-input">
              <button type="button" @click="decrementTime" class="btn-time-adjust" :disabled="room.time <= 30">-</button>
              <span class="time-display">{{ room.time }}s</span>
              <button type="button" @click="incrementTime" class="btn-time-adjust" :disabled="room.time >= 120">+</button>
            </div>
          </div>
          
          <div class="hologram-button-group">
            <button class="btn" type="submit">Guardar</button>
          </div>
        </form>
      </div>
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
 * modo de juego y tiempo de la partida.
 * - Si se accede para editar una sala existente (el `roomStore` tiene datos), precarga el
 * formulario con la configuración actual de esa sala.
 * - Si se accede para crear una sala nueva, inicializa el formulario con valores por defecto.
 * - Al guardar, llama al método correspondiente del `communicationManager` (`createRoom` o `updateRoom`)
 * y redirige al usuario al lobby de la sala.
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoomStore } from '../stores/room';
import { useGameStore } from '../stores/game';
import { useSessionStore } from '../stores/session';
import { communicationManager } from '../communicationManager';
import { useNotificationStore } from '../stores/notification';
import { useRouter } from 'vue-router';

const roomStore = useRoomStore();
const gameStore = useGameStore();
const sessionStore = useSessionStore();
const router = useRouter();

const goToProfile = () => {
  router.push('/profile');
}

// ---- Define Game Modes as an array ----
const gameModes = [
  { value: 'cuentaAtrasSimple', name: 'Cuenta Atrás Simple' },
  { value: 'powerUps', name: 'Power-Ups' },
  { value: 'modoJuego3', name: 'Modo de Juego 3' }
];

// `room` es una referencia reactiva que contiene los datos del formulario.
// Se inicializa con valores por defecto, usando el nombre del jugador para el nombre de la sala.
const room = ref({
  name: sessionStore.playerName ? `${sessionStore.playerName}'s Room` : 'Mi Sala',
  isPublic: true,
  gameMode: '', // Stays empty to trigger validation
  time: 60,
});

const validationError = ref('');

// ---- State and Refs for custom dropdowns ----
const isPublicOpen = ref(false);
const isGameModeOpen = ref(false);
const publicSelectRef = ref(null);
const gameModeSelectRef = ref(null);

// ---- FIX: Create a separate async function for data loading ----
const loadRoomData = async () => {
  await communicationManager.updatePlayerPage('room-settings');
  if (roomStore.room && roomStore.room.id) {
    room.value = { ...roomStore.room };
  }
};

// onMounted is now SYNCHRONOUS. It only handles setup.
onMounted(() => {
  // Add the listener immediately
  document.addEventListener('click', handleClickOutside);
  
  // Call the async function to load data, but don't await it
  loadRoomData();
});

// onUnmounted correctly cleans up the listener
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// ---- Helper function to get the display name ----
const getGameModeName = (modeValue) => {
  if (!modeValue) {
    return '-- Elige un modo de juego --';
  }
  const mode = gameModes.find(m => m.value === modeValue);
  return mode ? mode.name : '-- Elige un modo de juego --';
};

// ---- Handlers for custom dropdowns ----

const togglePublic = () => {
  isPublicOpen.value = !isPublicOpen.value;
  isGameModeOpen.value = false; // Close other dropdown
};

const toggleGameMode = () => {
  isGameModeOpen.value = !isGameModeOpen.value;
  isPublicOpen.value = false; // Close other dropdown
};

const selectPublic = (value) => {
  room.value.isPublic = value;
  isPublicOpen.value = false;
};

const selectGameMode = (value) => {
  room.value.gameMode = value;
  isGameModeOpen.value = false;
};

// ---- Functions for time adjustment ----
const incrementTime = () => {
  // Increment by 5, but don't go over 120
  room.value.time = Math.min(room.value.time + 5, 120);
};

const decrementTime = () => {
  // Decrement by 5, but don't go under 30
  room.value.time = Math.max(room.value.time - 5, 30);
};

// Click-outside handler
const handleClickOutside = (event) => {
  if (publicSelectRef.value && !publicSelectRef.value.contains(event.target)) {
    isPublicOpen.value = false;
  }
  if (gameModeSelectRef.value && !gameModeSelectRef.value.contains(event.target)) {
    isGameModeOpen.value = false;
  }
};

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
      try {
        const notificationStore = useNotificationStore();
        notificationStore.pushNotification({ type: 'success', message: 'Configuración de sala actualizada.' });
      } catch (e) {}
      sessionStore.setEtapa('lobby'); // Establece la etapa a 'lobby'
    } else {
      // Si no hay ID, estamos creando una nueva sala.
      const newRoom = await communicationManager.createRoom(room.value);
      // Guarda la nueva sala en el store.
      roomStore.setRoom(newRoom.data);
      try {
        const notificationStore = useNotificationStore();
        notificationStore.pushNotification({ type: 'success', message: 'Sala creada correctamente.' });
      } catch (e) {}
      // Guarda el ID de la sala en la sesión para persistencia.
      sessionStore.setRoomId(newRoom.data.id);
      // Se une a la sala recién creada a través del socket.
      communicationManager.joinRoom(newRoom.data.id);
      sessionStore.setEtapa('lobby'); // Establece la etapa a 'lobby'
    }
  } catch (error) {
    console.error('Error al guardar la configuración de la sala:', error);
    const notificationStore = useNotificationStore();
    notificationStore.pushNotification({ type: 'error', message: 'Error al guardar la configuración.' });
  }
};
</script>

<style src="../styles/styleRoomCreator.css"></style>