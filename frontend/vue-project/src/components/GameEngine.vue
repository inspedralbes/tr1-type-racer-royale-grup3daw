<template>
  <router-view />
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
import { useRouter } from 'vue-router';
import { communicationManager, socket } from '../communicationManager'
import { useNotificationStore } from '../stores/notification';
import { useSessionStore } from '../stores/session';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { usePublicRoomsStore } from '../stores/publicRooms';

// Inicialización de los stores de Pinia.
const router = useRouter();
const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();
const publicRoomsStore = usePublicRoomsStore();

const { nombreJugador, words, wordsLoaded, finalResults } = storeToRefs(gameStore);
const { etapa } = storeToRefs(sessionStore);
const { jugadores, roomState, roomId } = storeToRefs(roomStore);

// Función para navegar según la etapa actual
const navigateByEtapa = (currentEtapa) => {
  console.log('Navigating by etapa:', currentEtapa);
  switch (currentEtapa) {
    case 'room-selection':
      router.push('/game/select-room');
      break;
    case 'room-settings':
      if (roomStore.roomId) {
        router.push(`/game/room-settings/${roomStore.roomId}`);
      } else {
        router.push('/game/room-settings');
      }
      break;
    case 'lobby':
      if (roomStore.roomId) {
        router.push(`/game/lobby/${roomStore.roomId}`);
      } else {
        router.push('/game/select-room');
      }
      break;
    case 'game':
      if (roomState.value.gameMode && roomStore.roomId) {
        router.push(`/game/play/${roomState.value.gameMode}/${roomStore.roomId}`);
      } else {
        router.push('/game/select-room');
      }
      break;
    case 'done':
      router.push('/game/final');
      break;
    default:
      router.push('/login');
      break;
  }
};

    /**
     * Hook `onMounted`: Se ejecuta cuando el componente se monta en el DOM.
     * Su principal responsabilidad es gestionar la persistencia de la sesión y la reconexión.
     * Si existe un token y un nombre de jugador, intenta reconectar al jugador a su sala si estaba en una.
     * Si no hay sala, lo lleva a la selección de sala.
     */
    onMounted(async () => {
      console.log('GameEngine mounted. Initial etapa:', etapa.value);
      console.log('GameEngine mounted. Current route:', router.currentRoute.value.path);
  
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
          // Después de la reconexión o establecimiento de etapa, navegar
          navigateByEtapa(sessionStore.etapa);
        } catch (error) {
          console.error('Error al reconectar la sesión:', error);
          const notificationStore = useNotificationStore();
          notificationStore.pushNotification({ type: 'error', message: 'Error al reconectar la sesión: ' + (error.message || '') });
          // Si la reconexión falla, limpia todos los datos de sesión y estado,
          // y redirige al usuario a la pantalla de login.
          sessionStore.clearSession();
          gameStore.resetState();
          roomStore.resetState();
          publicRoomsStore.resetState();
          router.push('/login'); // Redirigir explícitamente al login
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
        router.push('/login'); // Redirigir explícitamente al login
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
    try {
      const notificationStore = useNotificationStore();
      notificationStore.pushNotification({ type: 'error', message: 'Error al obtener las palabras del servidor.' });
    } catch (e) {}
    gameStore.setWordsLoaded(false); // Ensure loading state is false on error
  }
}

/**
 * Observador (`watch`) que reacciona a los cambios en la `etapa` del juego.
 * Cuando la etapa cambia, navega a la ruta correspondiente.
 */
watch(etapa, async (newEtapa) => {
  console.log('GameEngine etapa changed to:', newEtapa);
  console.log('Current wordsLoaded:', wordsLoaded.value);
  await communicationManager.updatePlayerPage(newEtapa);
  // Solo navegar si la etapa no es 'game' y wordsLoaded no es true, o si es 'game' y wordsLoaded es false
  // Esto evita navegación redundante si ya estamos en la ruta correcta y solo se actualiza el estado interno
  if (newEtapa === 'game' && !wordsLoaded.value) {
    console.log('Etapa is game. Resetting wordsLoaded and fetching words.');
    gameStore.setWordsLoaded(false); // Reset wordsLoaded
    fetchWordsForGame(); // Always fetch words when entering game stage
  }
  navigateByEtapa(newEtapa);
});

/**
 * Se ejecuta cuando el componente `Joc` emite el evento `done`, indicando que la partida ha terminado.
 * Recibe los resultados, los procesa para la pantalla final y cambia la etapa a 'done'.
 * También resetea el estado de las palabras y el estado de "listo" de los jugadores en el backend.
 */
const onGameOver = async (resultados) => {
  console.log('onGameOver called. resultados:', resultados);

  const finalScores = jugadores.value.map(p => ({
    nombre: p.name,
    puntuacion: p.score
  }));
  
  gameStore.setFinalResults(finalScores);

  sessionStore.setEtapa('done');
  
  gameStore.setWordsLoaded(false);

  try {
    await communicationManager.resetReadyStatus(roomStore.roomId);
  } catch (error) {
    console.error('Error resetting ready status after game over:', error)
    try {
      const notificationStore = useNotificationStore();
      notificationStore.pushNotification({ type: 'error', message: 'Error al resetear el estado de listo tras finalizar la partida.' });
    } catch (e) {}
  }
};

const onReiniciar = () => {
  sessionStore.setEtapa('lobby');
  gameStore.setFinalResults([]);
  gameStore.setWords(null);
  gameStore.setWordsLoaded(false);
};
</script>
