<template>
  <div>
    <!--
      Este componente actúa como un "motor" o "director de orquesta" para la interfaz de usuario.
      Utiliza la variable de estado `etapa` (del store de Pinia) para renderizar condicionalmente
      el componente adecuado para cada fase del juego:
      - 'login': Pantalla de inicio de sesión.
      - 'lobby': Sala de espera antes de la partida.
      - 'game': La partida en sí.
      - 'done': Pantalla de resultados finales.
    -->
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

    <PlayerStats v-else-if="etapa === 'player-stats'" />
  </div>
</template>

<script setup>
/**
 * Fichero: GameEngine.vue
 * Descripción: Este es el componente principal que gestiona el flujo y el estado del juego.
 * Actúa como un enrutador de vistas, mostrando diferentes componentes (`Login`, `Lobby`, `Joc`, etc.)
 * basándose en el estado actual del juego (`etapa`), que se gestiona a través de Pinia.
 *
 * Funcionalidades clave:
 * - Orquesta la transición entre las diferentes fases del juego (login, lobby, partida, final).
 * - Maneja la lógica de reconexión de sesión al cargar la página, restaurando el estado del jugador
 *   y de la sala si existe una sesión válida.
 * - Escucha cambios en el estado del juego (como el inicio de una partida) para realizar acciones,
 *   como cargar las palabras necesarias para el juego.
 */
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Login from './login.vue'
import Lobby from './lobby.vue'
import Joc from './joc.vue' 
import Final from './paginaFinal.vue'
import RoomSettings from './RoomSettings.vue'
import RoomSelection from './RoomSelection.vue' // New import
import PlayerStats from './PlayerStats.vue' // New import
import { communicationManager, socket } from '../communicationManager'
import { useSessionStore } from '../stores/session';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { usePublicRoomsStore } from '../stores/publicRooms';

// Inicialización de los stores de Pinia para gestionar el estado global.
const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();
const publicRoomsStore = usePublicRoomsStore();

const { etapa, nombreJugador, words, wordsLoaded, finalResults } = storeToRefs(gameStore);
const { jugadores, roomState, roomId } = storeToRefs(roomStore);

    /**
     * Hook `onMounted`: Se ejecuta cuando el componente se monta en el DOM.
     * Su principal responsabilidad es gestionar la persistencia de la sesión.
     * Intenta reconectar al jugador si encuentra un token y un nombre de jugador en el `sessionStorage`.
     */
    onMounted(async () => {
      console.log('GameEngine mounted. Initial etapa:', etapa.value);
  
      const token = sessionStore.token;
      const roomIdFromSession = sessionStore.roomId;
      const playerNameFromSession = sessionStore.playerName;
  
      console.log('onMounted - Checking for existing session:');
      console.log('  Token from sessionStore:', token);
      console.log('  PlayerName from sessionStore:', playerNameFromSession);
      console.log('  RoomId from sessionStore:', roomIdFromSession);
  
      // Si hay un token y nombre, intenta reconectar la sesión.
      if (token && playerNameFromSession) { // Only attempt reconnection if both token and playerName exist
        console.log('onMounted - Existing token and playerName found. Attempting to reconnect...');
        try {
          // Conecta el socket y se registra en el backend. El backend validará el token
          // y devolverá el estado actualizado del jugador.
          const player = await communicationManager.connectAndRegister(playerNameFromSession);
          console.log('onMounted - Reconnected player:', player);
          gameStore.setNombreJugador(player.name); // Set gameStore's playerName from session

          // Si el jugador estaba en una sala, recuperamos su estado.
          if (player.roomId) {
            roomStore.setRoomId(player.roomId);
            sessionStore.setRoomId(player.roomId);
            communicationManager.joinRoom(player.roomId);

            // Obtiene los detalles completos de la sala para restaurar el estado.
            const roomDetails = await communicationManager.getRoomDetails(player.roomId);
            roomStore.setRoom(roomDetails.data); // Actualiza el store con todos los datos de la sala

            // Decide la etapa basándose en el estado de la sala recuperado.
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
          // Si la reconexión falla, limpia todos los datos de sesión y estado,
          // y redirige al usuario a la pantalla de login.
          sessionStore.clearSession();
          gameStore.resetState();
          roomStore.resetState();
          publicRoomsStore.resetState();
          sessionStore.resetState(); // Limpia el estado en memoria de pinia
          gameStore.setEtapa('login'); // Finalmente, redirige a login
        }
      } else {
        // Si no hay sesión, se asegura de que el estado esté limpio y muestra la pantalla de login.
        console.log('onMounted - No valid token or playerName found. Going to login screen.');
        sessionStore.resetState(); // Ensure all session data is cleared
        gameStore.resetState();
        roomStore.resetState();
        publicRoomsStore.resetState();
        gameStore.setEtapa('login');
      }
    })

/**
 * Se ejecuta después de que el usuario se loguea con éxito.
 * Guarda el nombre del jugador y lo lleva a la selección de sala,
 * o directamente a una sala si el ID ya estaba presente (ej. por un enlace de invitación).
 */
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

/**
 * Obtiene la lista de palabras del backend a través del `communicationManager`.
 * Actualiza el estado en el `gameStore` para indicar que las palabras están cargadas.
 */
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

/**
 * Observador (`watch`) que reacciona a los cambios en la `etapa` del juego.
 * Cuando la etapa cambia a 'game', resetea el estado de carga de palabras y
 * llama a `fetchWordsForGame` para obtener las palabras para la nueva partida.
 */
watch(etapa, async (newEtapa) => {
  console.log('GameEngine etapa changed to:', newEtapa);
  await communicationManager.updatePlayerPage(newEtapa);
  if (newEtapa === 'game') {
    gameStore.setWordsLoaded(false); // Reset wordsLoaded
    fetchWordsForGame(); // Always fetch words when entering game stage
  }
});

/**
 * Se ejecuta cuando el componente `Joc` emite el evento `done`, indicando que la partida ha terminado.
 * Recibe los resultados, los procesa para la pantalla final y cambia la etapa a 'done'.
 * También resetea el estado de las palabras y el estado de "listo" de los jugadores en el backend.
 */
const onGameOver = async (resultados) => {
  console.log('onGameOver called. resultados:', resultados);

  // La lista de jugadores en `roomStore` ya tiene las puntuaciones finales actualizadas
  // por los eventos de socket. Se mapea a un formato simple para la pantalla final.
  const finalScores = jugadores.value.map(p => ({
    nombre: p.name,
    puntuacion: p.score,
    wpm: p.name === resultados.jugador ? resultados.wpm : 0, // Assuming WPM is only for the current player
  }));
  
  gameStore.setFinalResults(finalScores);

  // Cambia a la pantalla final.
  gameStore.setEtapa('done')
  
  // Resetea el estado de las palabras para la siguiente partida.
  gameStore.setWordsLoaded(false)

  try {
    // Guarda la puntuación final en el backend
    await communicationManager.saveGameResult(resultados.jugador, resultados.puntuacion, resultados.wpm);
    console.log('Puntuación final guardada en MongoDB.');

    // Pide al backend que resetee el estado de "listo" de todos los jugadores en la sala.
    await communicationManager.resetReadyStatus(roomStore.roomId);
  } catch (error) {
    console.error('Error resetting ready status after game over or saving score:', error)
  }
}

// Manejar reinicio desde la pantalla final
/**
 * Se ejecuta cuando el usuario hace clic en "Reiniciar" en la pantalla final.
 * Resetea el estado del juego y devuelve al usuario al lobby para jugar de nuevo.
 */
const onReiniciar = () => {
  gameStore.setEtapa('lobby')
  gameStore.setFinalResults([])
  gameStore.setWords(null)
  gameStore.setWordsLoaded(false)
}
</script>
