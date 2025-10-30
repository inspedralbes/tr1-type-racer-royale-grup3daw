<template>
  <div>
    <Login v-if="etapa === 'login'" @login="onLogin" />

    <Lobby
      v-else-if="etapa === 'lobby'"
      :playerName="nombreJugador"
      :jugadores="jugadores"
      :roomState="roomState"
    />

    <template v-if="etapa === 'game'">
      <Joc
        v-if="wordsLoaded"
        :words="words"
        :playerName="nombreJugador"
        :jugadores="jugadores"
        @done="onGameOver"
      />
      <div v-else>
        <p>Cargando palabras...</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import Login from './login.vue'
import Lobby from './lobby.vue'
import Joc from './joc.vue' 
import { communicationManager } from '../communicationManager'

const nombreJugador = ref('') 
const etapa = ref('login')
const words = ref(null) // Referencia para guardar las palabras
const jugadores = ref([]) // Referencia para guardar la lista de jugadores
const roomState = ref({ isPlaying: false }) // Referencia para el estado de la sala
const wordsLoaded = ref(false) // Nueva referencia para controlar si las palabras se han cargado

// Setup global listeners for player list and room state
onMounted(async () => {
  console.log('GameEngine mounted. Initial etapa:', etapa.value);
  // Fetch initial players
  try {
    const response = await communicationManager.getRoomPlayers()
    jugadores.value = response.data
  } catch (error) {
    console.error('Error al obtener jugadores de la sala en GameEngine:', error)
  }

  communicationManager.onUpdatePlayerList((playerList) => {
    jugadores.value = playerList
  })

  communicationManager.onUpdateRoomState((state) => {
    roomState.value = state
    // GameEngine directamente cambia la etapa si el juego empieza
    if (state.isPlaying) {
      etapa.value = 'game'
    }
  })

  communicationManager.onPlayerRemoved(() => {
    console.log('Player removed event received. Redirecting to login.');
    etapa.value = 'login';
    // Opcional: limpiar cualquier estado de juego o jugador aquí
  });
})

function onLogin(player) {
  nombreJugador.value = player.name
  etapa.value = 'lobby'  
}

// Esta función ahora solo es responsable de obtener las palabras
async function fetchWordsForGame() {
  console.log('fetchWordsForGame called.');
  try {
    const response = await communicationManager.getWords()
    words.value = response.data
    wordsLoaded.value = true
    console.log('Words fetched successfully. wordsLoaded:', wordsLoaded.value, 'words:', words.value);
  } catch (error) {
    console.error('Error al obtener las palabras:', error)
    wordsLoaded.value = false; // Ensure loading state is false on error
  }
}

// Observa cuando roomState.isPlaying cambia a true para cargar las palabras
watch(etapa, (newEtapa) => {
  console.log('GameEngine etapa changed to:', newEtapa);
  if (newEtapa === 'game') {
    wordsLoaded.value = false; // Reset wordsLoaded
    fetchWordsForGame(); // Always fetch words when entering game stage
  }
});

// Observa cuando roomState.isPlaying cambia a true para cargar las palabras
watch(
  () => roomState.value.isPlaying,
  (newVal) => {
    console.log('roomState.isPlaying changed to:', newVal);
    if (newVal) {
      // etapa.value = 'game' is already handled by communicationManager.onUpdateRoomState
      // No need to call fetchWordsForGame() here, as it's handled by the etapa watch
    }
  }
);

const onGameOver = () => {
  console.log('onGameOver called. Setting etapa to lobby.');
  nextTick(async () => {
    etapa.value = 'lobby';
    wordsLoaded.value = false; // Reset wordsLoaded for next game
    try {
      await communicationManager.resetReadyStatus();
      console.log('Ready status reset successfully.');
    } catch (error) {
      console.error('Error resetting ready status:', error);
    }
  });
};
</script>
