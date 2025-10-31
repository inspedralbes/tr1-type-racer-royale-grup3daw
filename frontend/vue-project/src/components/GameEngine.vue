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
        :roomState="roomState"
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
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Login from './login.vue'
import Lobby from './lobby.vue'
import Joc from './joc.vue' 
import Final from './paginaFinal.vue'
import { communicationManager } from '../communicationManager'
import { useSessionStore } from '../stores/session';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';

const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();

const { etapa, nombreJugador, words, wordsLoaded, finalResults } = storeToRefs(gameStore);
const { jugadores, roomState } = storeToRefs(roomStore);

// Setup global listeners for player list and room state
onMounted(async () => {
  console.log('GameEngine mounted. Initial etapa:', etapa.value);

  const token = sessionStore.token;
  if (token) {
    try {
      const socketId = await communicationManager.connectAndRegister();
      const response = await communicationManager.login(null, socketId);
      const player = response.data;
      gameStore.setNombreJugador(player.name);
      if (player.remainingTime) {
        roomStore.setRemainingTime(player.remainingTime);
        gameStore.setEtapa('game');
      } else {
        gameStore.setEtapa('lobby');
      }
    } catch (error) {
      console.error('Error al reconectar:', error);
      alert('Error al reconectar: ' + error.message);
      sessionStore.clearToken(); // Invalid token, clear it
    }
  }

  // Fetch initial players
  try {
    const response = await communicationManager.getRoomPlayers()
    roomStore.setJugadores(response.data)
  } catch (error) {
    console.error('Error al obtener jugadores de la sala en GameEngine:', error)
  }

  communicationManager.onUpdatePlayerList();
  communicationManager.onUpdateRoomState();
  communicationManager.onPlayerRemoved();
})

function onLogin(player) {
  gameStore.setNombreJugador(player.name)
  gameStore.setEtapa('lobby')  
}

// Esta función ahora solo es responsable de obtener las palabras
async function fetchWordsForGame() {
  console.log('fetchWordsForGame called.');
  try {
    const response = await communicationManager.getWords()
    gameStore.setWords(response.data)
    gameStore.setWordsLoaded(true)
    console.log('Words fetched successfully. wordsLoaded:', wordsLoaded.value, 'words:', words.value);
  } catch (error) {
    console.error('Error al obtener las palabras:', error)
    gameStore.setWordsLoaded(false); // Ensure loading state is false on error
  }
}

// Observa cuando roomState.isPlaying cambia a true para cargar las palabras
watch(etapa, async (newEtapa) => {
  console.log('GameEngine etapa changed to:', newEtapa);
  await communicationManager.updatePlayerPage(newEtapa);
  if (newEtapa === 'game') {
    gameStore.setWordsLoaded(false); // Reset wordsLoaded
    fetchWordsForGame(); // Always fetch words when entering game stage
  }
});

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
    gameStore.setFinalResults(resultados)
  } else {
    gameStore.setFinalResults(lista)
  }

  // Cambiar a pantalla final
  gameStore.setEtapa('done')

  // Reset estado de palabras para la siguiente partida
  gameStore.setWordsLoaded(false)

  try {
    await communicationManager.resetReadyStatus()
  } catch (error) {
    console.error('Error resetting ready status after game over:', error)
  }
}

// Manejar reinicio desde la pantalla final
const onReiniciar = () => {
  gameStore.setEtapa('lobby')
  gameStore.setFinalResults([])
  gameStore.setWords(null)
  gameStore.setWordsLoaded(false)
}
</script>
