<template>
  <div>
    <Login v-if="etapa === 'login'" @login="onLogin" />

    <Lobby
      v-else-if="etapa === 'lobby'"
      :playerName="nombreJugador"
      :jugadores="jugadores"
      :roomState="roomState"
    />

    <RoomSettings v-else-if="etapa === 'room-settings'" />

    <template v-else-if="etapa === 'room-selection'">
      <RoomSelection />
    </template>

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
import RoomSettings from './RoomSettings.vue'
import RoomSelection from './RoomSelection.vue' // New import
import { communicationManager, socket } from '../communicationManager'
import { useSessionStore } from '../stores/session';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';

const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();

const { etapa, nombreJugador, words, wordsLoaded, finalResults } = storeToRefs(gameStore);
const { jugadores, roomState, roomId } = storeToRefs(roomStore);

// Setup global listeners for player list and room state
onMounted(async () => {
  console.log('GameEngine mounted. Initial etapa:', etapa.value);

  const token = sessionStore.token;
  const roomIdFromSession = sessionStore.roomId;
  const playerNameFromSession = sessionStore.playerName;

  if (token) {
    try {
      const socketId = await communicationManager.connectAndRegister();
      const response = await communicationManager.login(playerNameFromSession, socketId);
      const player = response.data;
      gameStore.setNombreJugador(player.name);

      if (roomIdFromSession) {
        roomStore.setRoomId(roomIdFromSession);
        communicationManager.joinRoom(roomIdFromSession);
        try {
          const roomDetails = await communicationManager.getRoomDetails(roomIdFromSession);
          roomStore.setRoom(roomDetails.data);
          if (roomDetails.data.isPlaying) {
            gameStore.setEtapa('game');
          } else {
            gameStore.setEtapa('lobby');
          }
        } catch (error) {
          if (error.response && error.response.status === 404) {
            sessionStore.clearRoomId();
            gameStore.setEtapa('room-selection');
          } else {
            throw error;
          }
        }
      } else {
        gameStore.setEtapa('room-selection');
      }
    } catch (error) {
      console.error('Error al reconectar:', error);
      alert('Error al reconectar: ' + error.message);
      sessionStore.clearToken();
      sessionStore.clearRoomId();
      gameStore.setEtapa('login');
    }
  }

  
})

// Watch for roomId changes to set up room-specific socket listeners


function onLogin(player) {
  gameStore.setNombreJugador(player.name);
  sessionStore.setPlayerName(player.name); // Ensure player name is set in session store
  if (roomStore.roomId) {
    // If a room ID is already set (e.g., from a deep link), try to join it
    communicationManager.joinRoom(roomStore.roomId);
    gameStore.setEtapa('lobby');
  } else {
    gameStore.setEtapa('room-selection'); // Go to room selection
  }
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

  // La lista de jugadores de la sala ya debería tener las puntuaciones finales actualizadas
  // a través de los eventos de socket. Simplemente la usamos.
  const finalScores = jugadores.value.map(p => ({
    nombre: p.name,
    puntuacion: p.score
  }));
  
  gameStore.setFinalResults(finalScores);

  // Cambiar a pantalla final
  gameStore.setEtapa('done')
  
  // Reset estado de palabras para la siguiente partida
  gameStore.setWordsLoaded(false)

  try {
    await communicationManager.resetReadyStatus(roomStore.roomId);
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
