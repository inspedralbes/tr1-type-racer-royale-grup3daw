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
       playerName: { type: String, default: '' },
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
   const POINTS_PENALTY_PER_ERROR = 1;

   const estatDelJoc = ref({ paraules: [], indexParaulaActiva: 0, textEntrat: '', stats: [], errorTotal: 0 });

   // --- Start of Animation Vars ---
   const meteorWordEl = ref(null);
   const shipShotEl = ref(null);
   const isShooting = ref(false);
   const shotStyle = ref({});
   const isMeteorBroken = ref(false);
   let audioDisparo = null;
   let audioExplosion = null;
   // --- End of Animation Vars ---

   const score = computed(() => {
       const nameToFind = playerName.value;
       const player = jugadoresStore.value.find(j => j.name === nameToFind);
       return player ? player.score : 0;
   });
   const gameEnded = ref(false);

   onMounted(async () => {
       await communicationManager.updatePlayerPage('MuerteSubita');
   });

   onUnmounted(() => {
       // Cleanup if needed
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
           return null;
       }
   });

   function initializeGame() {
       initializeWords(props.words);
   }

   const initializeWords = (wordsData) => {
       if (!wordsData) {
           console.error("initializeWords: wordsData és nul o indefinit.");
           notificationStore.pushNotification({ type: 'error', message: 'No s\'han pogut carregar les paraules per a la partida.' });
           estatDelJoc.value.paraules = [];
           return;
       }

       let allWords = [];
       if (wordsData.facil) allWords = allWords.concat(wordsData.facil.map(word => ({ text: word, difficulty: 'facil' })));
       if (wordsData.normal) allWords = allWords.concat(wordsData.normal.map(word => ({ text: word, difficulty: 'normal' })));
       if (wordsData.dificil) allWords = allWords.concat(wordsData.dificil.map(word => ({ text: word, difficulty: 'dificil' })));

       for (let i = allWords.length - 1; i > 0; i--) {
           const j = Math.floor(Math.random() * (i + 1));
           [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
       }

       estatDelJoc.value.paraules = allWords.map(p => ({ ...p, errors: 0, estat: 'pendent' }));
       estatDelJoc.value.indexParaulaActiva = 0;
       estatDelJoc.value.textEntrat = '';
   };
   
   watch([() => props.words, () => props.roomState?.isPlaying], ([newWords, newIsPlaying]) => {
       if (props.wordsLoaded && newWords && newIsPlaying && !gameEnded.value) {
           initializeGame();
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
           if (!gameEnded.value) {
               finishGame();
           }
       }
   }, { deep: true });

   async function finishGame(){
       if (gameEnded.value) return;
       gameEnded.value = true;

       const finalRanking = [];
       const eliminated = props.roomState.eliminatedPlayers;
       const survivor = jugadoresStore.value.find(p => !eliminated.includes(p.name));

       if (survivor) finalRanking.push({ nombre: survivor.name, puntuacion: jugadoresStore.value.length });
       for (let i = eliminated.length - 1; i >= 0; i--) finalRanking.push({ nombre: eliminated[i], puntuacion: eliminated.length - i });

       gameStore.setFinalResults(finalRanking);
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

   async function handleAnimationEnd(event) {
        if (event.animationName !== 'fallDown' || isMeteorBroken.value || isEliminated.value) {
            return;
        }
        console.log("Temps esgotat! El meteorit ha impactat.");
        if (!audioExplosion) {
            audioExplosion = new Audio(new URL('../../sound/meteoritoDestruido.mp3', import.meta.url).href);
            audioExplosion.volume = 1.0;
        }
        try {
            audioExplosion.currentTime = 0;
            await audioExplosion.play();
        } catch (e) {
            console.warn("No s'ha pogut reproduir el so d'explosió:", e);
        }
        isMeteorBroken.value = true;
        notificationStore.pushNotification({ type: 'error', message: 'Has estat eliminat!' });
        communicationManager.sendPlayerEliminated(roomStore.roomId, playerName.value);
   }

   async function triggerShot() {
       if (!meteorWordEl.value) return;
       if (!audioDisparo) {
           audioDisparo = new Audio(new URL('../../sound/disparo.mp3', import.meta.url).href);
           audioDisparo.volume = 1.0;
       }
       try {
           audioDisparo.currentTime = 0;
           await audioDisparo.play();
       } catch (e) {
           console.warn("No s'ha pogut reproduir el so de tret:", e);
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
   
   async function validarProgres() {
       if (isEliminated.value) return;

       const entrada = estatDelJoc.value.textEntrat.toLowerCase();
       estatDelJoc.value.textEntrat = entrada;

       const paraula = paraulaActiva.value;
       if (!paraula) return;

       for (let i = 0; i < entrada.length; i++) {
           paraula._errors = paraula._errors || [];
           if (entrada[i] !== paraula.text[i] && !paraula._errors[i]) {
               estatDelJoc.value.errorTotal++;
               paraula.errors++;
               paraula._errors[i] = true;
               try {
                   const newScore = Math.max(0, score.value - POINTS_PENALTY_PER_ERROR);
                   await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
               } catch (e) {
                   console.warn('Error en actualitzar la puntuació en cas d\'error:', e);
               }
           }
       }

       if (entrada === paraula.text) {
           await triggerShot();
           isMeteorBroken.value = true;

           setTimeout(async () => {
                try {
                    const newScore = score.value + POINTS_PER_DIFFICULTY[paraula.difficulty];
                    await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
                } catch (e) {
                    console.warn('Error en actualitzar la puntuació en completar la paraula:', e);
                }
                
                estatDelJoc.value.stats.push({
                    paraula: paraula.text,
                    errors: paraula.errors
                });
                paraula.estat = 'completada';
                estatDelJoc.value.indexParaulaActiva++;
                estatDelJoc.value.textEntrat = '';

                if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
                    initializeWords(props.words);
                }
           }, 300);
       }
   }
</script>

<template>
   <div class="main-background">
       <div class="game-container">
           <h2>Mort Súbita</h2>

           <div v-if="!gameEnded">
               <div v-if="isEliminated" class="eliminated-screen game-info">
                   <h2 class="eliminated-message">Has estat eliminat</h2>
                   <p>Esperant a la resta de jugadors...</p>
               </div>

               <main class="joc" v-else-if="estatDelJoc.paraules.length > 0">
                    <div class="game-info">
                        <p>Puntuació: {{ score }}</p>
                    </div>
                   <div class="game-content-wrapper">
                       <div class="paraula-actual">
                           <h1 ref="meteorWordEl"
                               :class="['fall-animation', { 'broken-animation': isMeteorBroken }]"
                               @animationend="handleAnimationEnd($event)">
                               <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                                   {{ lletra }}
                               </span>
                           </h1>
                           <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" autofocus :disabled="isEliminated" />
                           <img v-if="playerShipSrc" :src="playerShipSrc" alt="Nau seleccionada" class="player-ship" />
                           <div v-if="isShooting" ref="shipShotEl" class="ship-shot" :style="shotStyle"></div>
                       </div>

                       <div class="puntuacions">
                           <h2>Jugadors Vius</h2>
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
               <h2>Joc Acabat!</h2>
           </div>
       </div>
   </div>
</template>

<style src="../../styles/stylesCuentaAtrasSimple.css"></style>
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
