<template>
  <router-view v-slot="{ Component }"> <component :is="Component" /> </router-view>
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
import { useNotificationStore } from '../stores/notification.js';
import { useSessionStore } from '../stores/session.js';
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
const { etapa, roomId: sessionRoomId } = storeToRefs(sessionStore);
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
    case 'player-stats':
      router.push('/profile');
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
          // Si hay un token, simplemente conectamos. El backend validará el token en la conexión del socket.
          // La información sobre si es un invitado o un usuario registrado ya está en el sessionStore.
          communicationManager.connect();
          // Restauramos el nombre del jugador desde la sesión.
          gameStore.setNombreJugador(playerNameFromSession);

          // Si el jugador estaba en una sala, intentamos que se una de nuevo.
          if (roomIdFromSession) {
            communicationManager.joinRoom(roomIdFromSession);
          } else {
            sessionStore.setEtapa('room-selection');
          }
        } catch (error) {
          // Captura de errores generales durante el proceso de reconexión.
          console.error('Error al reconectar la sesión:', error);
          const notificationStore = useNotificationStore();
          notificationStore.pushNotification({ type: 'error', message: 'Error al reconectar la sesión: ' + (error.message || '') });
          sessionStore.resetState();
          gameStore.resetState();
          roomStore.resetState();
          publicRoomsStore.resetState();
          router.push('/login'); // Redirigir explícitamente al login.
        }
      } else {
        // Si no hay sesión válida (no hay token o playerNameFromSession),
        // o si es un invitado que recarga la página sin token.
        console.log('onMounted - No valid token or playerName found. Resetting state and redirecting to login.');
        // Si no hay token, no hay sesión. Limpiamos todo y redirigimos al login.
        sessionStore.resetState();
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
watch(etapa, async (newEtapa, oldEtapa) => {
  console.log('GameEngine etapa changed to:', newEtapa);
  // console.log('Current wordsLoaded:', wordsLoaded.value);
  await communicationManager.updatePlayerPage(newEtapa);

  // Lógica para cargar palabras solo cuando se entra a la etapa 'game'.
  if (newEtapa === 'game' && !wordsLoaded.value) {
    console.log('Etapa is game. Resetting wordsLoaded and fetching words.');
    gameStore.setWordsLoaded(false); // Reset wordsLoaded
    fetchWordsForGame(); // Always fetch words when entering game stage
  }

  // Navega a la nueva etapa. La función `navigateByEtapa` ya contiene la lógica
  // para manejar casos donde falten datos (como el roomId) y redirigir de forma segura.
  // Esto centraliza la navegación y la hace más predecible.
  if (newEtapa !== oldEtapa) {
    navigateByEtapa(newEtapa);
  }
});

/**
 * Se ejecuta cuando el componente `Joc` emite el evento `done`, indicando que la partida ha terminado.
 * Recibe los resultados, los procesa para la pantalla final y cambia la etapa a 'done'.
 * También resetea el estado de las palabras y el estado de "listo" de los jugadores en el backend.
 */
const onReiniciar = () => {
  sessionStore.setEtapa('lobby');
  gameStore.setFinalResults([]);
  gameStore.setWords(null);
  gameStore.setWordsLoaded(false);
};
</script>
