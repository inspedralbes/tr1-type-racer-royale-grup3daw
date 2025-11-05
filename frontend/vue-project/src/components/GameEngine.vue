<template>
  <div>
    <!--
      Este componente actúa como un "motor" o "director de orquesta" para la interfaz de usuario.
      Utiliza la variable de estado `etapa` (del store de Pinia) para renderizar condicionalmente
      el componente adecuado para cada fase del juego:
      - 'room-selection': Pantalla de selección de sala.
      - 'room-settings': Pantalla de configuración de sala.
      - 'lobby': Sala de espera antes de la partida.
      - 'game': La partida en sí.
      - 'done': Pantalla de resultados finales.
    -->
    <!-- <p>Current Etapa: {{ etapa }}</p> --> <!-- Removed this line after debugging -->

    <RoomSelection v-if="etapa === 'room-selection'" />
    <RoomSettings v-else-if="etapa === 'room-settings'" />
    <Lobby
      v-else-if="etapa === 'lobby'"
      :playerName="nombreJugador"
      :jugadores="jugadores"
      :roomState="roomState"
    />
    <template v-else-if="etapa === 'game'">
      <Joc
        v-if="wordsLoaded"
        :words="words"
        :wordsLoaded="wordsLoaded"
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
      v-else-if="etapa === 'done'"
      :resultados="finalResults"
      @reiniciar="onReiniciar"
    />
  </div>
</template>

<script setup>
/**
 * Fichero: GameEngine.vue
 * Descripción: Este es el componente principal que gestiona el flujo y el estado del juego.
 * Actúa como un enrutador de vistas, mostrando diferentes componentes (`Lobby`, `Joc`, etc.)
 * basándose en el estado actual del juego (`etapa`), que se gestiona a través de Pinia.
 * Asume que el usuario ya ha iniciado sesión al ser montado.
 *
 * Funcionalidades clave:
 * - Orquesta la transición entre las diferentes fases del juego (lobby, partida, final).
 * - Maneja la lógica de reconexión de sesión al cargar la página, restaurando el estado del jugador
 *   y de la sala si existe una sesión válida.
 * - Escucha cambios en el estado del juego (como el inicio de una partida) para realizar acciones,
 *   como cargar las palabras necesarias para el juego.
 */
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'; // Add this import
import Lobby from './lobby.vue'
import Joc from './joc.vue' 
import Final from './paginaFinal.vue'
import RoomSettings from './RoomSettings.vue'
import RoomSelection from './RoomSelection.vue'
import { communicationManager, socket } from '../communicationManager'
import { useSessionStore } from '../stores/session';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { usePublicRoomsStore } from '../stores/publicRooms';

// Inicialización de los stores de Pinia para gestionar el estado global.
const router = useRouter(); // Add this line
const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();
const publicRoomsStore = usePublicRoomsStore();

const { nombreJugador, words, wordsLoaded, finalResults } = storeToRefs(gameStore);
const { etapa } = storeToRefs(sessionStore);
const { jugadores, roomState, roomId } = storeToRefs(roomStore);

    /**
     * Hook `onMounted`: Se ejecuta cuando el componente se monta en el DOM.
     * Su principal responsabilidad es gestionar la persistencia de la sesión y la reconexión.
     * Si existe un token y un nombre de jugador, intenta reconectar al jugador a su sala si estaba en una.
     * Si no hay sala, lo lleva a la selección de sala.
     */
    onMounted(async () => {
      console.log('GameEngine mounted. Initial etapa:', etapa.value);
      console.log('GameEngine mounted. Current route:', router.currentRoute.value.path); // Add this line
  
      const token = sessionStore.token;
      const roomIdFromSession = sessionStore.roomId;
      const playerNameFromSession = sessionStore.playerName;
  
      console.log('GameEngine onMounted - Checking for existing session:');
      console.log('  Token from sessionStore:', token);
      console.log('  PlayerName from sessionStore:', playerNameFromSession);
      console.log('  RoomId from sessionStore:', roomIdFromSession);
  
      // Si hay un token y nombre, intenta reconectar la sesión.
      if (token && playerNameFromSession) {
        console.log('onMounted - Existing token and playerName found. Attempting to reconnect...');
        try {
          // 1. Conectar el socket. El token se envía automáticamente.
          communicationManager.connect();
          gameStore.setNombreJugador(playerNameFromSession);
  
          // Si el jugador estaba en una sala, recuperamos su estado.
          if (roomIdFromSession) {
            // Simplemente emitimos 'joinRoom'. El listener 'join-room-success'
            // o los eventos 'updateRoomState' se encargarán de poner al jugador
            // en la etapa correcta ('lobby' o 'game') con el estado actualizado.
            communicationManager.joinRoom(roomIdFromSession);
          } else {
            // Si no estaba en ninguna sala, va a la selección de sala.
            sessionStore.setEtapa('room-selection');
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
          // No redirigimos a /login aquí, ya que GameEngine no gestiona el login.
          // El router se encargará de redirigir si no hay sesión válida.
        }
      } else {
        // Si no hay sesión válida, GameEngine no debería estar montado.
        // Esto debería ser manejado por un guardia de ruta (router guard).
        // Por ahora, simplemente reseteamos el estado y esperamos la redirección del router.
        console.log('onMounted - No valid token or playerName found. Resetting state.');
        sessionStore.clearSession();
        gameStore.resetState();
        roomStore.resetState();
        publicRoomsStore.resetState();
      }
    })

/**
 * Obtiene la lista de palabras del backend a través del `communicationManager`.
 * Actualiza el estado en el `gameStore` para indicar que las palabras están cargadas.
 */
async function fetchWordsForGame() {
  console.log('fetchWordsForGame called.');
  try {
    const response = await communicationManager.getWords()
    console.log('API response for words:', response.data);
    if (response.data && Object.keys(response.data).length > 0) { // Check if data is not empty
      gameStore.setWords(response.data)
      gameStore.setWordsLoaded(true)
      console.log('Words fetched successfully. wordsLoaded:', wordsLoaded.value, 'words:', words.value);
    } else {
      console.warn('fetchWordsForGame: API returned empty or invalid word data.');
      gameStore.setWordsLoaded(false);
    }
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
  console.log('Current wordsLoaded:', wordsLoaded.value); // Add this line
  await communicationManager.updatePlayerPage(newEtapa);
  if (newEtapa === 'game' && !wordsLoaded.value) {
    console.log('Etapa is game. Resetting wordsLoaded and fetching words.'); // Add this log
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
    puntuacion: p.score
  }));
  
  gameStore.setFinalResults(finalScores);

  // Cambia a la pantalla final.
  sessionStore.setEtapa('done')
  
  // Resetea el estado de las palabras para la siguiente partida.
  gameStore.setWordsLoaded(false)

  try {
    // Pide al backend que resetee el estado de "listo" de todos los jugadores en la sala.
    await communicationManager.resetReadyStatus(roomStore.roomId);
  } catch (error) {
    console.error('Error resetting ready status after game over:', error)
  }
}

// Manejar reinicio desde la pantalla final
/**
 * Se ejecuta cuando el usuario hace clic en "Reiniciar" en la pantalla final.
 * Resetea el estado del juego y devuelve al usuario al lobby para jugar de nuevo.
 */
const onReiniciar = () => {
  sessionStore.setEtapa('lobby')
  gameStore.setFinalResults([])
  gameStore.setWords(null)
  gameStore.setWordsLoaded(false)
}
</script>
