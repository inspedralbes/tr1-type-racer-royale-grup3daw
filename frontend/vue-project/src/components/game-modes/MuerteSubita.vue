<script setup>
   import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';
   import { storeToRefs } from 'pinia';
   import { useRouter } from 'vue-router';
   import { communicationManager } from '../../communicationManager';
   import { useGameStore } from '../../stores/game';
   import { useNotificationStore } from '../../stores/notification';
   import { useRoomStore } from '../../stores/room';
   import { useSessionStore } from '../../stores/session';
  
   const props = defineProps({
       words: { type: Object, default: null },
       wordsLoaded: { type: Boolean, default: false },
       playerName: { type: String, default: '' }, // Nombre del jugador local
       jugadores: { type: Array, default: () => [] },
       roomState: { type: Object, default: () => ({ isPlaying: false, eliminatedPlayers: [] }) },
       gameMode: { type: String, required: true },
   });
  
   const gameStore = useGameStore();
   const roomStore = useRoomStore();
   const sessionStore = useSessionStore();
   const notificationStore = useNotificationStore();
   const router = useRouter();
  
   const { jugadores: jugadoresStore } = storeToRefs(roomStore);
   const { nombreJugador } = storeToRefs(gameStore);
  
   const playerName = computed(() => props.playerName || nombreJugador.value || '');
   const isEliminated = computed(() => props.roomState?.eliminatedPlayers?.includes(playerName.value) ?? false);
   const currentGameMode = computed(() => props.gameMode);
  
   const POINTS_PER_DIFFICULTY = {
       facil: 5,
       normal: 10,
       dificil: 15,
   };
   // === LÓGICA DE TIEMPO PARA MUERTE SÚBITA ===
   const INITIAL_TIME = 10; // Segundos iniciales para cada jugador
   const TIME_BONUS_PER_DIFFICULTY = {
       facil: 2,
       normal: 3,
       dificil: 5,
   };
   const TIME_PENALTY_PER_ERROR = 1; // Segundos que se restan por cada error
   const POINTS_PENALTY_PER_ERROR = 1; // Puntos que se restan por cada error
  
   const estatDelJoc = ref({ paraules: [], indexParaulaActiva: 0, textEntrat: '', stats: [], errorTotal: 0 });
  
   const meteorWordEl = ref(null);
   const isMeteorBroken = ref(false);
   let audioExplosion = null;

   const timeLeft = ref(INITIAL_TIME); // El tiempo ahora es local para el jugador
   const score = computed(() => {
       const nameToFind = playerName.value;
       const player = jugadoresStore.value.find(j => j.name === nameToFind);
       return player ? player.score : 0;
   });
   let gameInterval = null;
   const gameEnded = ref(false); // Estado para controlar si el juego ha terminado.
  
   onMounted(async () => {
       await communicationManager.updatePlayerPage('MuerteSubita');
       console.log('MuerteSubita.vue mounted. roomState:', props.roomState);
       console.log('MuerteSubita.vue mounted. props.wordsLoaded:', props.wordsLoaded);
   });

   onUnmounted(() => {
       if (gameInterval) clearInterval(gameInterval);
   });

   const playerShipSrc = computed(() => {
       try {
           const player = jugadoresStore.value.find(j => j.name === playerName.value) || {};
           const avatar = player.avatar || 'nave';
           const color = player.color || 'Azul';
           if (avatar === 'noImage') {
               return new URL('../../img/noImage.png', import.meta.url).href;
           }
           const filename = `${avatar}${color}.png`;
           return new URL(`../../img/${filename}`, import.meta.url).href;
       } catch (e) {
           // Fallback image
           // console.error("Error loading player ship image:", e);
           // return new URL('../../img/noImage.png', import.meta.url).href;
           // Returning null to not display anything if there's an error
           return null;
       }
   });
  
   function initializeGame() {
       switch (currentGameMode.value) {
           case 'muerteSubita':
               initializeWords(props.words);
               startGameTimer(); // Iniciar el temporizador individual
               break;
           default:
               console.warn('Modo de juego desconocido:', currentGameMode.value);
               initializeWords(props.words);
               startGameTimer(); // Fallback
       }
   }
  
   const startGameTimer = () => {
       if (gameInterval) clearInterval(gameInterval);
       timeLeft.value = INITIAL_TIME; // Reiniciar el tiempo a 10 segundos
  
       gameInterval = setInterval(() => {
           timeLeft.value--;
           if (timeLeft.value <= 0) {
                clearInterval(gameInterval);
                gameInterval = null;
                notificationStore.pushNotification({ type: 'error', message: '¡Has sido eliminado!' });
                // Notificar al backend que este jugador ha sido eliminado
                communicationManager.sendPlayerEliminated(roomStore.roomId, playerName.value);
           }
       }, 1000);
   };
  
   const initializeWords = (wordsData) => {
       if (!wordsData) {
           console.error("initializeWords: wordsData es nulo o indefinido.");
           try {
               const notificationStore = useNotificationStore();
               notificationStore.pushNotification({ type: 'error', message: 'No se han podido cargar las palabras para la partida.' });
           } catch (e) {
               // ignore if store not available
           }
           estatDelJoc.value.paraules = [];
           return;
       }
  
       let allWords = [];
       if (wordsData.facil) {
           allWords = allWords.concat(wordsData.facil.map(word => ({ text: word, difficulty: 'facil' })));
       }
       if (wordsData.normal) {
           allWords = allWords.concat(wordsData.normal.map(word => ({ text: word, difficulty: 'normal' })));
       }
       if (wordsData.dificil) {
           allWords = allWords.concat(wordsData.dificil.map(word => ({ text: word, difficulty: 'dificil' })));
       }
  
       for (let i = allWords.length - 1; i > 0; i--) {
           const j = Math.floor(Math.random() * (i + 1));
           [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
       }
  
       estatDelJoc.value.paraules = allWords.map(p => ({ ...p, errors: 0, estat: 'pendent' }));
       estatDelJoc.value.indexParaulaActiva = 0;
       estatDelJoc.value.textEntrat = '';
   };
   
   watch([() => props.words, () => props.roomState?.isPlaying], ([newWords, newIsPlaying]) => {
       console.log('MuerteSubita.vue watch triggered. props.wordsLoaded:', props.wordsLoaded, 'newWords:', newWords, 'newIsPlaying:', newIsPlaying, 'gameEnded:', gameEnded.value);
       if (props.wordsLoaded && newWords && newIsPlaying && !gameEnded.value) {
           console.log('Words loaded and game is playing. Initializing game.');
           initializeGame();
       } else {
           console.log('Conditions not met for initializeGame.');
       }
   }, { immediate: true, deep: true });
  
   watch(() => estatDelJoc.value.indexParaulaActiva, async () => {
       await nextTick();
       if (meteorWordEl.value) {
           isMeteorBroken.value = false;
           meteorWordEl.value.classList.remove('fall-animation');
           void meteorWordEl.value.offsetWidth;
           meteorWordEl.value.classList.add('fall-animation');
       }
   });

   watch(() => props.roomState.eliminatedPlayers, (eliminated) => {
       const totalPlayers = jugadoresStore.value?.length ?? 0;
       if (totalPlayers > 1 && eliminated && eliminated.length >= totalPlayers - 1) {
           console.log('Solo queda un jugador o menos. Finalizando partida.');
           // Si el juego no ha terminado localmente, lo finalizamos.
           if (!gameEnded.value) {
               finishGame();
           }
       }
   }, { deep: true });
  
   async function finishGame(){
       if (gameEnded.value) return; // Evitar que se llame múltiples veces
       if(gameInterval){
           clearInterval(gameInterval);
           gameInterval = null;
       }
       gameEnded.value = true;
  
       const finalRanking = [];
       const eliminated = props.roomState.eliminatedPlayers;
       const survivor = jugadoresStore.value.find(p => !eliminated.includes(p.name));

       // El superviviente (ganador) es el primero en el ranking.
       if (survivor) finalRanking.push({ nombre: survivor.name, puntuacion: jugadoresStore.value.length });

       // Los eliminados se añaden en orden inverso de eliminación (el último eliminado es el segundo, etc.)
       for (let i = eliminated.length - 1; i >= 0; i--) finalRanking.push({ nombre: eliminated[i], puntuacion: eliminated.length - i });
  
       // Se establecen los resultados finales en el store del juego.
       gameStore.setFinalResults(finalRanking);
       // Se cambia la etapa a 'done', lo que hará que GameEngine redirija a todos a la pantalla final.
       sessionStore.setEtapa('done');
   };

   const paraulaActiva = computed(() => {
       return estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva];
   });

   function obtenirClasseLletra(lletra, index) {
       const entrada = estatDelJoc.value.textEntrat[index];
       if (!entrada) return '';
       return lletra === entrada ? 'lletra-correcta' : 'lletra-incorrecta';
   };
   
   async function validarProgres() {
       if (isEliminated.value) return; // Si el jugador ya está eliminado, no procesar entrada

       const entrada = estatDelJoc.value.textEntrat.toLowerCase();
       estatDelJoc.value.textEntrat = entrada;

       const paraula = paraulaActiva.value;
       if (!paraula) return;

       // Lógica de Muerte Súbita: un error resta tiempo.
       for (let i = 0; i < entrada.length; i++) { // Iterar sobre la entrada del usuario
           paraula._errors = paraula._errors || []; // Inicializar array de errores por letra
           if (entrada[i] !== paraula.text[i] && !paraula._errors[i]) {
               estatDelJoc.value.errorTotal++;
               paraula.errors++;
               paraula._errors[i] = true;
               timeLeft.value = Math.max(0, timeLeft.value - TIME_PENALTY_PER_ERROR);

               // RESTAR PUNTOS POR ERROR
               try {
                   const newScore = Math.max(0, score.value - POINTS_PENALTY_PER_ERROR);
                   await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
               } catch (e) {
                   console.warn('Error updating score on error:', e);
               }
           }
       }

       // Si la palabra se completa correctamente.
       // Usamos un setTimeout para que la palabra se muestre como correcta brevemente antes de cambiar.
       if (entrada === paraula.text) {
           // Añadir puntos por la palabra correcta
           try {
               const newScore = score.value + POINTS_PER_DIFFICULTY[paraula.difficulty];
               await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
           } catch (e) {
               console.warn('Error updating score on word completion:', e);
           }
           // Añadir tiempo extra según la dificultad
           timeLeft.value += TIME_BONUS_PER_DIFFICULTY[paraula.difficulty];
           
           setTimeout(() => {
               estatDelJoc.value.stats.push({
                   paraula: paraula.text,
                   errors: 0 // En muerte súbita, si se completa no hay errores.
               });
               paraula.estat = 'completada';
               estatDelJoc.value.indexParaulaActiva++;
               estatDelJoc.value.textEntrat = '';

               // Si se acaban las palabras, se barajan de nuevo.
               if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
                   initializeWords(props.words);
               }
           }, 100);
       }
   }

</script>

<template>
   <div class="main-background">
       <div class="game-container">
           <h2>Muerte Súbita</h2>

           <div v-if="!gameEnded">
               <!-- Pantalla de eliminado para el jugador local -->
               <div v-if="isEliminated" class="eliminated-screen game-info">
                   <h2 class="eliminated-message">Te has quedado sin tiempo</h2>
                   <p>Esperando al resto de jugadores...</p>
               </div>

               <!-- Interfaz de juego para jugadores activos -->
               <main class="joc" v-else-if="estatDelJoc.paraules.length > 0">
                    <div class="game-info">
                        <p>Tiempo: {{ timeLeft }}s</p>
                        <p>Puntuación: {{ score }}</p>
                    </div>
                   <div class="game-content-wrapper">
                       <div class="paraula-actual">
                           <h1 ref="meteorWordEl"
                               :class="['fall-animation', { 'broken-animation': isMeteorBroken }]"
                               >
                           <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                               {{ lletra }}
                           </span>
                           </h1>
                           <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" autofocus :disabled="isEliminated" />
                           <img v-if="playerShipSrc" :src="playerShipSrc" alt="Nave seleccionada" class="player-ship" />
                       </div>

                       <div class="puntuacions">
                           <h2>Jugadores Vivos</h2>
                           <ul id="llista-jugadors">
                               <li v-for="jugador in jugadoresStore.filter(j => !roomState.eliminatedPlayers?.includes(j.name))" :key="jugador.name">
                                   <strong>{{ jugador.name }}</strong>
                               </li>
                           </ul>
                       </div>
                   </div>
               </main>
           </div>

           <div v-else class="game-end-screen">
               <h2>¡Juego Terminado!</h2>
           </div>
       </div>
   </div>
</template>

<style>
.eliminated-screen {
    text-align: center;
    margin-top: 50px;
}
.eliminated-screen h1 {
    color: #ff4141;
    text-shadow: 0 0 10px #ff4141;
}

.eliminated-message {
    color: #ff4141;
    text-shadow: 0 0 10px #ff4141;
}
</style>