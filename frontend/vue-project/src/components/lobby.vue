<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { communicationManager } from '../communicationManager'

const props = defineProps({
  playerName: String
})

const emit = defineEmits(['startGame'])

const jugadores = ref([])
const roomState = ref({ isPlaying: false })

const isAdmin = computed(() => {
  const player = jugadores.value.find(j => j.name === props.playerName)
  return player && player.role === 'admin'
})

// Fetch initial players and set up socket listener
onMounted(async () => {
  try {
    const response = await communicationManager.getRoomPlayers()
    jugadores.value = response.data
  } catch (error) {
    console.error('Error al obtener jugadores de la sala:', error)
  }

  communicationManager.onUpdatePlayerList((playerList) => {
    jugadores.value = playerList
  })

  communicationManager.onUpdateRoomState((state) => {
    roomState.value = state
    if (state.isPlaying) {
      emit('startGame')
    }
  })
})

// Clean up socket listeners
onUnmounted(() => {
  // communicationManager.offUpdatePlayerList() // Assuming a method to turn off specific listeners if needed
  // communicationManager.offUpdateRoomState() // Assuming a method to turn off specific listeners if needed
})

function iniciarJuego() {
  if (isAdmin.value) {
    communicationManager.startGame()
      .then(response => {
        console.log(response.data.message)
      })
      .catch(error => {
        console.error('Error al iniciar el juego:', error)
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
      <li v-for="(jugador) in jugadores" :key="jugador.name">
        {{ jugador.name }}
      </li>
    </ul>

    <button @click="iniciarJuego" :disabled="!isAdmin">Començar Joc</button>
  </div>
</template>

<style src="../styles/style.css"></style>
