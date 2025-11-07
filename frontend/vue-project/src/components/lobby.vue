<template>
  <div class="lobby-background">
    <div class="lobby-contenedor">
      <button class="back-button" @click="goBack">←</button>
      <h1>Lobby</h1>
      <h2>Benvingut, {{ nombreJugador }}!</h2>
      <ul class="lista-jugadores">
        <li v-for="(jugador) in jugadores" :key="jugador.name">
          <span>{{ jugador.name }} <span v-if="jugador.role === 'admin'">⭐</span></span>
          <span v-if="jugador.disconnected"> (Desconectado)</span>
          <span v-else-if="jugador.role !== 'admin'"> 
            <span v-if="jugador.isReady"> (Listo)</span><span v-else> (No listo)</span>
          </span>
          <div class="lobby-button-group" v-if="isAdmin && jugador.name !== nombreJugador">
            <button class="btn btn-small" @click="removePlayer(jugador.socketId)">Eliminar</button>
            <button class="btn btn-small" @click="makeHost(jugador.socketId)">Hacer Host</button>
          </div>
        </li>
      </ul>

      <div class="lobby-button-group">
        <button class="btn" v-if="!isAdmin" @click="toggleReady">{{ isPlayerReady ? 'No listo' : 'Listo' }}</button>
        <button class="btn" v-if="isAdmin" @click="goToRoomSettings">Editar Sala</button>
        <button class="btn" v-if="isAdmin" @click="iniciarJuego" :disabled="!isAdmin || !areAllPlayersReady">Començar Joc</button>
      </div>
    </div>
    <img class="naves" :src="naveActual" @click="cambiarNave" />
  </div>
</template>

<!-- Importa los estilos específicos para el componente Lobby. -->
<style src="../styles/styleLobby.css"></style>

<script setup>
// Importaciones de Vue y Pinia para la gestión del estado y la reactividad.
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router';
// Importaciones de módulos de comunicación y stores personalizados.
import { communicationManager, socket } from '../communicationManager'
import { useNotificationStore } from '../stores/notification'
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { useSessionStore } from '../stores/session';
import { usePublicRoomsStore } from '../stores/publicRooms';

import imgNaveRoja from '../img/naveRoja.png'
import imgNaveAzul from '../img/naveAzul.png'
import imgNaveVerde from '../img/naveVerde.png'
import imgNaveAmarilla from '../img/naveAmarilla.png'

// Inicialización de los stores.
const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();
const publicRoomsStore = usePublicRoomsStore();
const router = useRouter();

//Carrusel de imagenes
const naveRoja = ref(imgNaveRoja);
const naveAzul = ref(imgNaveAzul);
const naveVerde = ref(imgNaveVerde);
const naveAmarilla = ref(imgNaveAmarilla);
const naveActual = ref(naveRoja.value);

function cambiarNave() {
  if (naveActual.value === naveRoja.value) {
    naveActual.value = naveAzul.value;
  } else if (naveActual.value === naveAzul.value) {
    naveActual.value = naveVerde.value;
  } else if (naveActual.value === naveVerde.value) {
    naveActual.value = naveAmarilla.value;
  } else {
    naveActual.value = naveRoja.value;
  }
}

// Hook `onMounted` que se ejecuta cuando el componente ha sido montado.
onMounted(async () => {
  // Actualiza la página actual del jugador a 'lobby'.
  await communicationManager.updatePlayerPage('lobby');
});

// Desestructura las propiedades reactivas de los stores.
const { nombreJugador } = storeToRefs(gameStore);
const { jugadores } = storeToRefs(roomStore);

/**
 * @description Propiedad computada que indica si el jugador actual es el administrador de la sala.
 * @returns {boolean} - Verdadero si el jugador es administrador, falso en caso contrario.
 */
const isAdmin = computed(() => {
  const player = jugadores.value.find(j => j.name === nombreJugador.value)
  return player && player.role === 'admin'
})

/**
 * @description Propiedad computada que indica si el jugador actual está listo.
 * @returns {boolean} - Verdadero si el jugador está listo, falso en caso contrario.
 */
const isPlayerReady = computed(() => {
  const player = jugadores.value.find(j => j.name === nombreJugador.value);
  return player ? player.isReady : false;
});

/**
 * @description Propiedad computada que indica si todos los jugadores (excepto el administrador) están listos.
 * @returns {boolean} - Verdadero si todos los jugadores están listos, falso en caso contrario.
 */
const areAllPlayersReady = computed(() => {
  return jugadores.value.length > 0 && jugadores.value.every(p => p.isReady && !p.disconnected);
});

function goToRoomSettings() {
  sessionStore.setEtapa('room-settings');
}

/**
 * @description Función para regresar a la pantalla de selección de sala.
 * Emite un evento 'leave-room' al servidor y resetea el estado de la sala.
 */
const goBack = () => {
  socket.emit('leave-room', roomStore.roomId);
    roomStore.resetState();
  sessionStore.setRoomId(null); // Clear roomId from sessionStore
  sessionStore.setEtapa('room-selection');
};

/**
 * @description Función para eliminar un jugador de la sala. Solo accesible para el administrador.
 * @param {string} playerSocketId - El ID del socket del jugador a eliminar.
 */
const removePlayer = async (playerSocketId) => {
  if (isAdmin.value) {
    try {
      await communicationManager.removePlayer(roomStore.roomId, playerSocketId);
      console.log(`Jugador con socketId ${playerSocketId} eliminado.`);
    } catch (error) {
      console.error('Error al eliminar jugador:', error);
      const notificationStore = useNotificationStore();
      notificationStore.pushNotification({ type: 'error', message: error.response?.data?.message || 'Error al eliminar jugador.' });
    }
  } else {
    console.warn('Solo el administrador puede eliminar jugadores.');
  }
};

/**
 * @description Función para transferir el rol de host a otro jugador. Solo accesible para el administrador.
 * @param {string} targetPlayerSocketId - El ID del socket del jugador que se convertirá en host.
 */
const makeHost = async (targetPlayerSocketId) => {
  if (isAdmin.value) {
    try {
      await communicationManager.makeHost(roomStore.roomId, targetPlayerSocketId);
      console.log(`Jugador con socketId ${targetPlayerSocketId} es ahora el host.`);
    } catch (error) {
      console.error('Error al hacer host al jugador:', error);
      const notificationStore = useNotificationStore();
      notificationStore.pushNotification({ type: 'error', message: error.response?.data?.message || 'Error al hacer host al jugador.' });
    }
  } else {
    console.warn('Solo el administrador puede hacer host a otros jugadores.');
  }
};

/**
 * @description Función para cambiar el estado de 'listo' del jugador actual.
 * No accesible para el administrador.
 */
const toggleReady = () => {
  if (!isAdmin.value) {
    console.log('Toggling ready status. Current isPlayerReady:', isPlayerReady.value, 'Sending:', !isPlayerReady.value);
    communicationManager.sendReadyStatus(!isPlayerReady.value);
  }
};

/**
 * @description Función para iniciar el juego. Solo accesible para el administrador y si todos los jugadores están listos.
 */
function iniciarJuego() {
  if (isAdmin.value) {
    communicationManager.startGame(roomStore.roomId)
      .then(response => {
        console.log('Game started:', response.data);
        sessionStore.setEtapa('game');
      })
      .catch(error => {
        console.error('Error al iniciar el juego:', error);
        const notificationStore = useNotificationStore();
        notificationStore.pushNotification({ type: 'error', message: error.response?.data?.message || 'Error al iniciar el juego.' });
      });
  } else {
    console.warn('Solo el administrador puede iniciar el juego.');
  }
}


</script>
