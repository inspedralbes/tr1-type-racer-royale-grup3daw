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
    <Final 
    v-if="etapa === 'done'"
    :resultados="finalResults"
    @reiniciar="onReiniciar"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import Login from './login.vue'
import Lobby from './lobby.vue'
import Joc from './joc.vue' 
import Final from './paginaFinal.vue'
import { communicationManager } from '../communicationManager'

const nombreJugador = ref('') 
const etapa = ref('login')
const words = ref(null) // Referencia para guardar las palabras
const jugadores = ref([]) // Referencia para guardar la lista de jugadores
const roomState = ref({ isPlaying: false }) // Referencia para el estado de la sala
const wordsLoaded = ref(false) // Nueva referencia para controlar si las palabras se han cargado

// Nuevo: resultados finales para pasar a paginaFinal
const finalResults = ref([])

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

// Recibe resultados desde <Joc @done="..."> y cambia a pantalla final
const onGameOver = async (resultados) => {
  console.log('onGameOver called. resultados:', resultados);

  // Construir array que paginaFinal espera: [{ nombre, puntuacion }, ...]
  const lista = jugadores.value.map(p => ({
    nombre: p.name ?? p.nombre ?? 'Anon',
    puntuacion: p.score ?? p.puntuacion ?? 0
  }))

  if (resultados && resultados.jugador) {
    const idx = lista.findIndex(p => p.nombre === resultados.jugador)
    if (idx !== -1) {
      lista[idx].puntuacion = resultados.puntuacion
    } else {
      lista.push({ nombre: resultados.jugador, puntuacion: resultados.puntuacion })
    }
  }

  // Si resultados es ya un array, usarlo directamente
  if (Array.isArray(resultados)) {
    finalResults.value = resultados
  } else {
    finalResults.value = lista
  }

  // Cambiar a pantalla final
  etapa.value = 'done'

  // Reset estado de palabras para la siguiente partida
  wordsLoaded.value = false

  try {
    await communicationManager.resetReadyStatus()
  } catch (error) {
    console.error('Error resetting ready status after game over:', error)
  }
}

// Manejar reinicio desde la pantalla final
const onReiniciar = () => {
  etapa.value = 'lobby'
  finalResults.value = []
  words.value = null
  wordsLoaded.value = false
}
</script>
