<script setup>
   import { ref, computed, onMounted, watch, nextTick } from 'vue';
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
       playerName: { type: String, default: '' },
       jugadores: { type: Array, default: () => [] },
       roomState: { type: Object, default: () => ({ time: 0, isPlaying: false, gameStartTime: null }) },
       gameMode: { type: String, required: true },
   });
  
   const gameStore = useGameStore();
   const roomStore = useRoomStore();
   const sessionStore = useSessionStore();
   const router = useRouter();
  
   const { jugadores: jugadoresStore, remainingTime } = storeToRefs(roomStore);
   const { nombreJugador } = storeToRefs(gameStore);
  
   const playerName = computed(() => props.playerName || nombreJugador.value || '');
   const currentGameMode = computed(() => props.gameMode);
  
   const jugadoresOrdenats = computed(() => {
       return [...jugadoresStore.value].sort((a, b) => b.score - a.score);
   });
  
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
  
   const emits = defineEmits(['done']);
  
   const estatDelJoc = ref({
       paraules: [],
       indexParaulaActiva: 0,
       textEntrat: '',
       stats: [],
       errorTotal: 0,
   });
  
   const meteorWordEl = ref(null);
   const shipShotEl = ref(null);
   const isShooting = ref(false);
   const shotStyle = ref({});

   const isEliminated = ref(false); // Nuevo estado para saber si el jugador local ha sido eliminado
   const timeLeft = ref(INITIAL_TIME); // El tiempo ahora es local para el jugador
   const score = computed(() => {
       const nameToFind = playerName.value;
       const player = jugadoresStore.value.find(j => j.name === nameToFind);
       return player ? player.score : 0;
   });
   let gameInterval = null;
   const gameEnded = ref(false);
  
   onMounted(async () => {
       await communicationManager.updatePlayerPage('muerteSubita');
       console.log('MuerteSubita.vue mounted. roomState:', props.roomState);
       console.log('MuerteSubita.vue mounted. props.wordsLoaded:', props.wordsLoaded);
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
                isEliminated.value = true;
                communicationManager.sendPlayerEliminated(roomStore.roomId);
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
           console.log('Conditions not met for initializeGame in MuerteSubita.vue.');
       }
   }, { immediate: true, deep: true });
  
   watch(() => estatDelJoc.value.indexParaulaActiva, async () => {
       await nextTick();
       if (meteorWordEl.value) {
           meteorWordEl.value.classList.remove('fall-animation');
           void meteorWordEl.value.offsetWidth;
           meteorWordEl.value.classList.add('fall-animation');
       }
   });

   // Observador para detectar el fin de la partida (cuando solo queda 1 jugador)
   watch(jugadoresStore, (newJugadores) => {
       if (!props.roomState?.isPlaying || gameEnded.value) return;

       const playersAlive = newJugadores.filter(p => !p.isEliminated);

       if (playersAlive.length <= 1 && newJugadores.length > 1) {
           console.log('Solo queda un jugador o menos. Finalizando partida.');
           // Si el juego no ha terminado localmente, lo finalizamos.
           if (!gameEnded.value) {
               finishGame();
           }
       }
   }, { deep: true });
  
   async function finishGame(){
       if(gameInterval){
           clearInterval(gameInterval);
           gameInterval = null;
       }
       gameEnded.value = true;
  
       const totalTypedChars = estatDelJoc.value.stats.reduce((acc, word) => acc + word.paraula.length, 0);
       const gameDurationInMinutes = props.roomState.time / 60;
       const wpm = gameDurationInMinutes > 0 ? (totalTypedChars / 5) / gameDurationInMinutes : 0;
  
       const gameStats = {
           playerName: playerName.value,
           words: estatDelJoc.value.stats,
           score: score.value,
           gameMode: currentGameMode.value,
           errors: estatDelJoc.value.errorTotal,
           wpm: wpm,
       };
  
       if (sessionStore.email) {
           try {
               await communicationManager.sendGameStats(gameStats);
           } catch (error) {
               console.error("Error sending game stats:", error);
               const notificationStore = useNotificationStore();
               notificationStore.pushNotification({
                   type: 'error',
                   message: 'No se pudieron guardar las estadísticas de la partida.',
               });
           }
       }
  
       switch (currentGameMode.value) {
           case 'muerteSubita':
               const finalScores = jugadoresStore.value.map(p => ({
                   nombre: p.name,
                   puntuacion: p.score,
                   wpm: p.wpm,
               }));
               gameStore.setFinalResults(finalScores);
               sessionStore.setEtapa('done');
               break;
           default:
               console.warn('Modo de juego desconocido al finalizar:', currentGameMode.value);
               const defaultFinalScores = jugadoresStore.value.map(p => ({
                   nombre: p.name,
                   puntuacion: p.score,
                   wpm: p.wpm
               }));
               gameStore.setFinalResults(defaultFinalScores);
               sessionStore.setEtapa('done');
       }
   }

   const paraulaActiva = computed(() => {
       return estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva];
   });

   function obtenirClasseLletra(lletra, index) {
       const entrada = estatDelJoc.value.textEntrat[index];
       if (!entrada) return '';
       return lletra === entrada ? 'lletra-correcta' : 'lletra-incorrecta';
   };

   async function validarProgres() {
       const entrada = estatDelJoc.value.textEntrat.toLowerCase();
       estatDelJoc.value.textEntrat = entrada;

       const paraula = paraulaActiva.value;
       if (!paraula) return;

       // Lógica de Muerte Súbita: un error resta tiempo.
       for (let i = 0; i < entrada.length; i++) {
           paraula._errors = paraula._errors || [];
           // Si el tiempo llega a 0 mientras escribe, detenemos el proceso.
           if (timeLeft.value <= 0) {
               if (!isEliminated.value) isEliminated.value = true;
               return;
           }

           if (entrada[i] !== paraula.text[i] && !paraula._errors[i]) {
               estatDelJoc.value.errorTotal++;
               paraula.errors++;
               paraula._errors[i] = true;
               timeLeft.value = Math.max(0, timeLeft.value - TIME_PENALTY_PER_ERROR);
           }
       }

       // Si la palabra se completa correctamente.
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
       }
   }

   const backToLobby = () => {
       console.log('Navigating to lobby');
       sessionStore.setEtapa('lobby');
   };

</script>

<template>
   <div class="main-background">
       <div class="game-container">
           <h2>Muerte Súbita</h2>
           <p class="game-subtitle">¡Mantén tu tiempo por encima de cero!</p>

           <div v-if="isEliminated && !gameEnded">
               <div class="game-info">
                   <h2 class="eliminated-message">Has sido eliminado</h2>
                   <p>Esperando a que termine la partida...</p>
               </div>
           </div>
           <div v-else-if="!gameEnded">
               <div class="game-info">
                   <p>Tiempo: {{ timeLeft }}s</p>
                   <p>Puntuació: {{ score }}</p>
               </div>
               <main class="joc" v-if="estatDelJoc.paraules.length > 0">
                   <div class="paraula-actual">
                       <h1 ref="meteorWordEl">
                           <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                               {{ lletra }}
                           </span>
                       </h1>
                       <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" autofocus />
                   </div>
               </main>
           </div>

           <div v-else class="game-end-screen">
               <h2>¡Juego Terminado!</h2>
               <p>Tu puntuación final: {{ score }}</p>
               <h3>Clasificación Final</h3>
               <ul id="llista-jugadors-final">
                   <li v-for="jugador in jugadoresOrdenats" :key="jugador.name">
                       <strong>{{ jugador.name }}</strong> - {{ jugador.score }} punts
                   </li>
               </ul>
               <button class="btn" @click="backToLobby">Volver al Lobby</button>
           </div>
       </div>
   </div>
</template>

<style src="../../styles/stylesCuentaAtrasSimple.css"></style>