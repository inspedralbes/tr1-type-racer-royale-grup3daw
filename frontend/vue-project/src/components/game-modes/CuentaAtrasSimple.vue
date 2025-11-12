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
   const PENALTY_PER_ERROR = 1;
  
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

   const timeLeft = ref(props.roomState?.time ?? 0);
   const score = computed(() => {
       const nameToFind = playerName.value;
       const player = jugadoresStore.value.find(j => j.name === nameToFind);
       return player ? player.score : 0;
   });
   let gameInterval = null;
   const gameEnded = ref(false);
  
   onMounted(async () => {
       await communicationManager.updatePlayerPage('cuentaAtrasSimple');
       console.log('CuentaAtrasSimple.vue mounted. roomState:', props.roomState);
       console.log('CuentaAtrasSimple.vue mounted. props.wordsLoaded:', props.wordsLoaded);
   });
  
   watch([() => props.words, () => props.roomState?.isPlaying], ([newWords, newIsPlaying]) => {
       console.log('CuentaAtrasSimple.vue watch triggered. props.wordsLoaded:', props.wordsLoaded, 'newWords:', newWords, 'newIsPlaying:', newIsPlaying, 'gameEnded:', gameEnded.value);
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
           meteorWordEl.value.classList.remove('fall-animation');
           void meteorWordEl.value.offsetWidth;
           meteorWordEl.value.classList.add('fall-animation');
       }
   });
  
   function initializeGame() {
       // Este componente solo se usa para 'cuentaAtrasSimple', no se necesita un switch.
       initializeWords(props.words);
       startGameTimer();
   }
  
   const initializeTimer = () => {
       const now = Date.now();
       const startTime = props.roomState?.gameStartTime;
       if (!startTime) {
           timeLeft.value = props.roomState?.time ?? 0;
           return;
       }
       const totalDurationMs = (props.roomState?.time ?? 0) * 1000;
       const elapsedMs = now - startTime;
       const remainingMs = totalDurationMs - elapsedMs;
       timeLeft.value = Math.max(0, Math.floor(remainingMs / 1000));
   };
  
   const startGameTimer = () => {
       if (gameInterval) clearInterval(gameInterval);
       initializeTimer();
  
       gameInterval = setInterval(() => {
           timeLeft.value--;
           if (timeLeft.value <= 0) {
               clearInterval(gameInterval);
               gameInterval = null;
               finishGame();
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
  
       // Este componente solo se usa para 'cuentaAtrasSimple', no se necesita un switch.
       const finalScores = jugadoresStore.value.map(p => ({
           nombre: p.name,
           puntuacion: p.score,
           wpm: p.wpm,
       }));
       gameStore.setFinalResults(finalScores);
       sessionStore.setEtapa('done');
   }
  
   const paraulaActiva = computed(() => {
       return estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva];
   });
  
   const playerShipSrc = computed(() => {
       try {
           const nameToFind = playerName.value;
           const player = jugadoresStore.value.find(j => j.name === nameToFind) || {};
           const avatar = player.avatar || 'nave';
           const color = player.color || 'Azul';
           if (avatar === 'noImage') {
               return new URL('../../img/noImage.png', import.meta.url).href;
           }
           const filename = `${avatar}${color}.png`;
           return new URL(`../../img/${filename}`, import.meta.url).href;
       } catch (e) {
           return null;
       }
   });
  
   let temps = 0;
   function cronometro() {
       temps = Date.now();
   }
  
   function obtenirClasseLletra(lletra, index) {
       const entrada = estatDelJoc.value.textEntrat[index];
       if (!entrada) return '';
       return lletra === entrada ? 'lletra-correcta' : 'lletra-incorrecta';
   };
  
   async function validarProgres() {
       const entrada = estatDelJoc.value.textEntrat.toLowerCase();
       estatDelJoc.value.textEntrat = entrada;
  
       if (entrada.length === 1 && temps === 0){
           cronometro();
       };
  
       const paraula = paraulaActiva.value;
  
       for (let i = 0; i < entrada.length; i++){
           paraula._errors = paraula._errors || [];
  
           if(entrada[i] !== paraula.text[i] && !paraula._errors[i]){
               paraula.errors++;
               estatDelJoc.value.errorTotal++;
               paraula._errors[i] = true;
  
               try {
                   const newScore = Math.max(0, score.value - PENALTY_PER_ERROR);
                   await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
               } catch (e) {
                   console.warn('Error applying penalty score:', e);
               }
           };
       };
  
       if (entrada === paraula.text){
           // Activar el disparo ANTES de cambiar la palabra
           await triggerShot();
           
           try {
               const newScore = score.value + POINTS_PER_DIFFICULTY[paraula.difficulty];
               await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
           } catch (e) {
               console.warn('Error updating score on word completion:', e);
           }
  
           estatDelJoc.value.stats.push({
               paraula: paraula.text,
               errors: paraula.errors
           });            
           paraula.estat = 'completada';
           estatDelJoc.value.indexParaulaActiva++;
           estatDelJoc.value.textEntrat = '';
  
           if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
               const wordsDataLocal = props.words;
               if (wordsDataLocal) {
                   let allWords = [];
                   if (wordsDataLocal.facil) allWords = allWords.concat(wordsDataLocal.facil.map(word => ({ text: word, difficulty: 'facil' })));
                   if (wordsDataLocal.normal) allWords = allWords.concat(wordsDataLocal.normal.map(word => ({ text: word, difficulty: 'normal' })));
                   if (wordsDataLocal.dificil) allWords = allWords.concat(wordsDataLocal.dificil.map(word => ({ text: word, difficulty: 'dificil' })));
                   for (let i = allWords.length - 1; i > 0; i--) {
                       const j = Math.floor(Math.random() * (i + 1));
                       [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
                   }
                   estatDelJoc.value.paraules = allWords.map(p => ({ ...p, errors: 0, estat: 'pendent' }));
                   estatDelJoc.value.indexParaulaActiva = 0;
               } else {
                   finishGame();
               }
           }
       };
   };

   // === MODIFICADO: Lógica para el disparo (Recto hacia arriba) ===
   async function triggerShot() {
       if (!meteorWordEl.value) { // Sigue siendo una buena idea comprobar que la palabra existe
           console.warn("No se puede disparar, el meteorito (h1) no está montado.");
           return;
       }

       isShooting.value = true;
       await nextTick(); // Asegura que el div del disparo esté en el DOM.

       // 1. Encontrar la posición de la nave
       const shipEl = document.querySelector('.player-ship');
       if (!shipEl) {
            isShooting.value = false;
            return;
       }
       const shipRect = shipEl.getBoundingClientRect();
       
       // 2. Calcular el punto de partida (centro-superior de la nave)
       const shipX = shipRect.left + shipRect.width / 2;
       const shipY = shipRect.top; // Usamos el borde superior de la imagen

       // 3. Aplicar solo la posición inicial. La animación CSS se encarga del resto.
       shotStyle.value = {
           'left': `${shipX}px`,
           'top': `${shipY}px`,
       };

       // 4. Resetear el estado de disparo después de que la animación termine
       setTimeout(() => {
           isShooting.value = false;
           shotStyle.value = {}; // Limpiar estilos
       }, 500); // Coincide con la duración de la animación en CSS
   }

   if (timeLeft.value <= 0){
       finishGame();
   }
  
   const backToLobby = () => {
       console.log('Navigating to lobby');
       sessionStore.setEtapa('lobby');
   };
</script>


<template>
   <div class="main-background">
       <div class="game-container">
           <h2>Compte enrere, {{ playerName }}!</h2>


           <div v-if="!gameEnded">
               <div class="game-info">
                   <p>Temps restant: {{ timeLeft }}s</p>
                   <p>Puntuació: {{ score }}</p>
               </div>


               <div class="puntuacions">
                   <h2>Puntuacions</h2>
                   <TransitionGroup tag="ul" id="llista-jugadors" name="list-ranking">
                       <li v-for="jugador in jugadoresOrdenats" :key="jugador.name">
                           <span>{{ jugador.name }}</span>
                           <strong>{{ jugador.score }}</strong>
                       </li>
                   </TransitionGroup>
               </div>
               <main class="joc" v-if="estatDelJoc.paraules.length > 0">
                   <div class="game-content-wrapper">
                       <div class="paraula-actual">
                           
                           <h1 ref="meteorWordEl" class="fall-animation">
                               <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                                   {{ lletra }}
                               </span>
                           </h1>
                           <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" autofocus />
                           <img v-if="playerShipSrc" :src="playerShipSrc" alt="Nave seleccionada" class="player-ship" />
                           
                           <div v-if="isShooting" ref="shipShotEl" class="ship-shot" :style="shotStyle"></div>
                       </div>
                   </div>
               </main>


           </div>
       </div>
   </div>
</template>