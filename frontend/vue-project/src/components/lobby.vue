<template>
  <div class="lobby-background">
    <div class="lobby-contenedor">
      <button class="back-button" @click="goBack">←</button>
      <h1>Lobby</h1>
      <h2>Benvingut, {{ nombreJugador }}!</h2>
      <ul class="lista-jugadores">
        <li v-for="(jugador) in jugadores" :key="jugador.name">
          {{ jugador.name }} <span v-if="jugador.role === 'admin'">⭐</span>
          <span v-if="jugador.role !== 'admin'">
            <span v-if="jugador.isReady"> (Listo)</span><span v-else> (No listo)</span>
          </span>
          <button class="lobby-button" v-if="isAdmin && jugador.socketId !== socket.id" @click="removePlayer(jugador.socketId)">Eliminar</button>
          <button class="lobby-button" v-if="isAdmin && jugador.socketId !== socket.id" @click="makeHost(jugador.socketId)">Hacer Host</button>
        </li>
      </ul>

      <button class="lobby-button" v-if="!isAdmin" @click="toggleReady">{{ isPlayerReady ? 'No listo' : 'Listo' }}</button>

      <button class="lobby-button" v-if="isAdmin" @click="goToRoomSettings">Editar Sala</button>
      <button class="lobby-button" v-if="isAdmin" @click="iniciarJuego" :disabled="!isAdmin || !areAllPlayersReady">Començar Joc</button>
      <button class="lobby-button" @click="logout">Logout</button>
    </div>
  </div>
</template>

<style src="../styles/styleLobby.css"></style>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { communicationManager, socket } from '../communicationManager'
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { useSessionStore } from '../stores/session';

const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();

const { nombreJugador } = storeToRefs(gameStore);
const { jugadores } = storeToRefs(roomStore);

const isAdmin = computed(() => {
  const player = jugadores.value.find(j => j.name === nombreJugador.value)
  return player && player.role === 'admin'
})

const isPlayerReady = computed(() => {
  const player = jugadores.value.find(j => j.name === nombreJugador.value);
  return player ? player.isReady : false;
});

const areAllPlayersReady = computed(() => {
  return jugadores.value.every(p => p.role === 'admin' || p.isReady);
});

const goBack = () => {
  socket.emit('leave-room', roomStore.roomId);
  sessionStore.clearRoomId();
  gameStore.setEtapa('room-selection');
};

const logout = () => {
  socket.emit('leave-room', roomStore.roomId);
  sessionStore.clearToken();
  sessionStore.clearRoomId();
  gameStore.setEtapa('login');
};

const removePlayer = async (playerSocketId) => {
  if (isAdmin.value) {
    try {
      await communicationManager.removePlayer(roomStore.roomId, playerSocketId); // Pass roomId
      console.log(`Jugador con socketId ${playerSocketId} eliminado.`);
    } catch (error) {
      console.error('Error al eliminar jugador:', error);
      alert(error.response?.data?.message || 'Error al eliminar jugador.');
    }
  } else {
    console.warn('Solo el administrador puede eliminar jugadores.');
  }
};

const makeHost = async (targetPlayerSocketId) => {
  if (isAdmin.value) {
    try {
      await communicationManager.makeHost(roomStore.roomId, targetPlayerSocketId); // Pass roomId
      console.log(`Jugador con socketId ${targetPlayerSocketId} es ahora el host.`);
    } catch (error) {
      console.error('Error al hacer host al jugador:', error);
      alert(error.response?.data?.message || 'Error al hacer host al jugador.');
    }
  } else {
    console.warn('Solo el administrador puede hacer host a otros jugadores.');
  }
};

const toggleReady = () => {
  if (!isAdmin.value) {
    console.log('Toggling ready status. Current isPlayerReady:', isPlayerReady.value, 'Sending:', !isPlayerReady.value);
    communicationManager.sendReadyStatus(!isPlayerReady.value);
  }
};

function iniciarJuego() {
  if (isAdmin.value) {
    communicationManager.startGame(roomStore.roomId)
      .then(response => {
        console.log(response.data.message)
      })
      .catch(error => {
        console.error('Error al iniciar el juego:', error)
        alert(error.response?.data?.message || 'Error al iniciar el juego.');
      })
  } else {
    console.warn('Solo el administrador puede iniciar el juego.')
  }
}

function goToRoomSettings() {
  gameStore.setEtapa('room-settings');
}
</script>
