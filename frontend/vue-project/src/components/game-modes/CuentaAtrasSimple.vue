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
   let audioDisparo = null;
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
   // === AÑADIDO (De nuevo) ===
   const PENALTY_PER_TIMEOUT = 10; // Penalización por tiempo agotado

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
   
   // Estado para controlar la animación de explosión
   const isMeteorBroken = ref(false);

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
  
   // Este 'watch' es el que resetea la animación CADA vez que cambia la palabra
   watch(() => estatDelJoc.value.indexParaulaActiva, async () => {
       await nextTick(); // Espera a que el DOM se actualice (cambie la palabra)
       if (meteorWordEl.value) {
           
           // 1. Resetea el estado de 'roto' para el nuevo meteorito
           isMeteorBroken.value = false; 
            
           // 2. QUITA la clase de animación de caída
           meteorWordEl.value.classList.remove('fall-animation');

           // 3. FUERZA al navegador a recalcular el estilo (reflow)
           void meteorWordEl.value.offsetWidth; 

           // 4. AÑADE la clase de nuevo
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
  
   function initializeWords(wordsData) {
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
   }
  
   async function finishGame(){
       if(gameInterval){
           clearInterval(gameInterval);
           gameInterval = null;
       }
       gameEnded.value = true;
       
       // === CORREGIDO (Error tipográfico) ===
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
           await triggerShot();
           isMeteorBroken.value = true;
           
           setTimeout(async () => {
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
           }, 300); // 300ms de retraso
       };
   };

   // Lógica para el disparo (Recto hacia arriba)
   async function triggerShot() {
       if (!meteorWordEl.value) {
           console.warn("No se puede disparar, el meteorito (h1) no está montado.");
           return;
       }
       if (!audioDisparo) {
           audioDisparo = new Audio('/src/sound/disparo.mp3');
           audioDisparo.volume = 1.0;
       }
       try {
           audioDisparo.currentTime = 0;
           await audioDisparo.play();
       } catch (e) {
           console.warn("No se pudo reproducir el sonido de disparo:", e);
       }

       isShooting.value = true;
       await nextTick();

       const shipEl = document.querySelector('.player-ship');
       if (!shipEl) {
            isShooting.value = false;
            return;
       }
       const shipRect = shipEl.getBoundingClientRect();
       
       const shipX = shipRect.left + shipRect.width / 2;
       const shipY = shipRect.top;

       shotStyle.value = {
           'left': `${shipX}px`,
           'top': `${shipY}px`,
       };

       setTimeout(() => {
           isShooting.value = false;
           shotStyle.value = {};
       }, 500);
   }

   // === AÑADIDO (De nuevo) ===
   /**
    * Se dispara cuando la animación 'fallDown' (6s) termina.
    */
   async function handleAnimationEnd(event) {
       
       // 1. Filtra para que SOLO reaccione a la animación 'fallDown'
       if (event.animationName !== 'fallDown') {
           return;
       }
       
       // 2. Si el jugador ya acertó (y rompió el meteorito), no hagas nada.
       //    (La clase .broken-animation pausa la animación, pero esta es una
       //     doble seguridad por si acaso)
       if (isMeteorBroken.value) {
           return;
       }

       console.log("¡Tiempo agotado para la palabra! Penalización.");

       // 3. Activa la explosión visual
       isMeteorBroken.value = true;

       // 4. Aplica la penalización de 10 puntos
       try {
           const newScore = Math.max(0, score.value - PENALTY_PER_TIMEOUT);
           await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
       } catch (e) {
           console.warn('Error applying penalty score for meteor end:', e);
       }
       
       // 5. Pasa a la siguiente palabra (con un retraso para ver la explosión)
       setTimeout(() => {
           estatDelJoc.value.indexParaulaActiva++;
           estatDelJoc.value.textEntrat = '';
   
           // Lógica para recargar palabras si se acaban
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
       }, 300); // 300ms de retraso
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
                           
                           <h1 ref="meteorWordEl" 
                               :class="['fall-animation', { 'broken-animation': isMeteorBroken }]"
                               @animationend="handleAnimationEnd($event)"> 
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