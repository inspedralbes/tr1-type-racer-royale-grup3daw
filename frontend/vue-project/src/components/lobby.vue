<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue' // Removed 'watch'
import { communicationManager, socket } from '../communicationManager'

const props = defineProps({
  playerName: String,
  jugadores: Array, // Ahora recibido como prop de GameEngine
  roomState: Object // Ahora recibido como prop de GameEngine
})

// Ya no se emite 'startGame' desde Lobby, GameEngine maneja los cambios de roomState

const isAdmin = computed(() => {
  const player = props.jugadores.find(j => j.name === props.playerName) // Usa props.jugadores
  return player && player.role === 'admin'
})

const isPlayerReady = computed(() => {
  const player = props.jugadores.find(j => j.name === props.playerName);
  return player ? player.isReady : false;
});

const areAllPlayersReady = computed(() => {
  // Host is always ready. Check if all non-host players are ready.
  return props.jugadores.every(p => p.role === 'admin' || p.isReady);
});

const removePlayer = async (playerSocketId) => {
  if (isAdmin.value) {
    try {
      // Asumimos que el socket.id del host es el socket.id del jugador actual
      const hostSocketId = socket.id;
      await communicationManager.removePlayer(playerSocketId, hostSocketId);
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
      const currentHostSocketId = socket.id;
      await communicationManager.makeHost(currentHostSocketId, targetPlayerSocketId);
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
  // Only non-host players can toggle their ready status
  if (!isAdmin.value) {
    console.log('Toggling ready status. Current isPlayerReady:', isPlayerReady.value, 'Sending:', !isPlayerReady.value);
    communicationManager.sendReadyStatus(!isPlayerReady.value);
  }
};

// Fetch initial players and set up socket listener
onMounted(async () => {
  // Lobby ya no obtiene jugadores ni escucha el estado de la sala directamente.
  // Los recibe como props de GameEngine.
  // El onMounted de GameEngine se encargará de la obtención inicial y los listeners.
})

// Clean up socket listeners
onUnmounted(() => {
  // No hay listeners que limpiar en Lobby, ya que GameEngine los gestiona.
})

function iniciarJuego() {
  if (isAdmin.value) {
    communicationManager.startGame()
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
</script>

<template>
  <div class="lobby-contenedor">
    <h1>Lobby</h1>
    <h2>Benvingut, {{ playerName }}!</h2>
    <ul class="lista-jugadores">
      <li v-for="(jugador) in props.jugadores" :key="jugador.name">
        {{ jugador.name }} <span v-if="jugador.role === 'admin'">⭐</span>
        <span v-if="jugador.role !== 'admin'">
          <span v-if="jugador.isReady"> (Listo)</span><span v-else> (No listo)</span>
        </span>
        <button class="lobby-button" v-if="isAdmin && jugador.socketId !== socket.id" @click="removePlayer(jugador.socketId)">Eliminar</button>
        <button class="lobby-button" v-if="isAdmin && jugador.socketId !== socket.id" @click="makeHost(jugador.socketId)">Hacer Host</button>
      </li>
    </ul>

    <button class="lobby-button" v-if="!isAdmin" @click="toggleReady">{{ isPlayerReady ? 'No listo' : 'Listo' }}</button>

    <button class="lobby-button" v-if="isAdmin" @click="iniciarJuego" :disabled="!isAdmin || !areAllPlayersReady">Començar Joc</button>
  </div>
</template>

<style src="../styles/style.css"></style>
