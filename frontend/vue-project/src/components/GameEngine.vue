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
import { usePublicRoomsStore } from '../stores/publicRooms';

const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();
const publicRoomsStore = usePublicRoomsStore();

const { etapa, nombreJugador, words, wordsLoaded, finalResults } = storeToRefs(gameStore);
const { jugadores, roomState, roomId } = storeToRefs(roomStore);

// Setup global listeners for player list and room state
    onMounted(async () => {
      console.log('GameEngine mounted. Initial etapa:', etapa.value);
  
      const token = sessionStore.token;
      const roomIdFromSession = sessionStore.roomId;
      const playerNameFromSession = sessionStore.playerName;
  
      console.log('onMounted - Checking for existing session:');
      console.log('  Token from sessionStore:', token);
      console.log('  PlayerName from sessionStore:', playerNameFromSession);
      console.log('  RoomId from sessionStore:', roomIdFromSession);
  
      if (token && playerNameFromSession) { // Only attempt reconnection if both token and playerName exist
        console.log('onMounted - Existing token and playerName found. Attempting to reconnect...');
        try {
          // Conecta el socket y deja que el backend valide el token.
          const player = await communicationManager.connectAndRegister(playerNameFromSession);
          console.log('onMounted - Reconnected player:', player);
          gameStore.setNombreJugador(player.name); // Set gameStore's playerName from session

          // Si el jugador estaba en una sala, recuperamos su estado.
          if (player.roomId) {
            roomStore.setRoomId(player.roomId);
            sessionStore.setRoomId(player.roomId);
            communicationManager.joinRoom(player.roomId);

            // Obtenemos los detalles completos de la sala para restaurar el estado
            const roomDetails = await communicationManager.getRoomDetails(player.roomId);
            roomStore.setRoom(roomDetails.data); // Actualiza el store con todos los datos de la sala

            // Ahora decidimos la etapa basándonos en el estado de la sala recuperado
            if (roomDetails.data.isPlaying) {
              gameStore.setEtapa('game');
            } else {
              gameStore.setEtapa('lobby');
            }
          } else {
            // Si no estaba en ninguna sala, vamos a la página que indique el backend (ej. 'room-selection')
            gameStore.setEtapa(player.currentPage || 'room-selection');
          }
        } catch (error) {
          console.error('Error al reconectar la sesión:', error);
          alert('Error al reconectar la sesión: ' + error.message);
          // If reconnection fails, clear all persisted session data and go to login
          sessionStore.resetState();
          gameStore.resetState(); // Also reset gameStore to clear playerName
          roomStore.resetState();
          publicRoomsStore.resetState();
          gameStore.setEtapa('login');
        }
      } else {
        // If no token or playerName, ensure we are on the login screen and clear any stale data
        console.log('onMounted - No valid token or playerName found. Going to login screen.');
        sessionStore.resetState(); // Ensure all session data is cleared
        gameStore.resetState();
        roomStore.resetState();
        publicRoomsStore.resetState();
        gameStore.setEtapa('login');
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
