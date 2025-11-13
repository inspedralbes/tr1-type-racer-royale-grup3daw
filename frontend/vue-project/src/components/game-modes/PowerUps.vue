<script setup>
    // Importaciones de Vue para la reactividad y gestión del ciclo de vida del componente.
    // === MODIFICADO === (Añadido 'nextTick')
    import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue';
    // Importación de Pinia para desestructurar propiedades reactivas de los stores.
    import { storeToRefs } from 'pinia';
    import { useRouter } from 'vue-router';
    import { communicationManager } from '../../communicationManager';
    // Importación de los stores de Pinia para la gestión del estado global de la aplicación.
    import { useGameStore } from '../../stores/game';
    import { useNotificationStore } from '../../stores/notification';
    import { useRoomStore } from '../../stores/room';
    import { useSessionStore } from '../../stores/session';

    // Definición de props para el componente.
    const props = defineProps({
        words: { type: Object, default: null },
        wordsLoaded: { type: Boolean, default: false },
        playerName: { type: String, default: '' },
        jugadores: { type: Array, default: () => [] },
        roomState: { type: Object, default: () => ({ time: 0, isPlaying: false, gameStartTime: null }) },
        gameMode: { type: String, required: true },
    });

    // Inicialización de los stores.
    const gameStore = useGameStore();
    const roomStore = useRoomStore();
    const sessionStore = useSessionStore();
    const notificationStore = useNotificationStore();
    const router = useRouter();

    // Desestructuración de propiedades reactivas de los stores.
    const { jugadores: jugadoresStore, remainingTime } = storeToRefs(roomStore);
    const { nombreJugador } = storeToRefs(gameStore);

    const playerName = computed(() => props.playerName || nombreJugador.value || '');
    const currentGameMode = computed(() => props.gameMode);

    // Jugadores ordenados para la clasificación
    const jugadoresOrdenats = computed(() => {
       // console.log('DATOS DE JUGADORES EN EL STORE:', JSON.stringify(jugadoresStore.value, null, 2));
       return [...jugadoresStore.value].sort((a, b) => b.score - a.score);
    });

    // === AÑADIDO === (Computed para la nave, copiado de CuentaAtrasSimple)
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

    // Definición de puntos por dificultad de palabra.
    const POINTS_PER_DIFFICULTY = {
        facil: 5,
        normal: 10,
        dificil: 15,
    };
    const PENALTY_PER_ERROR = 1;
    // === AÑADIDO ===
    const PENALTY_PER_TIMEOUT = 10; // Penalización por tiempo agotado

    // Declaración de eventos que este componente puede emitir.
    const emits = defineEmits(['done']);
    
    // Estado reactivo local para la gestión del juego.
    const estatDelJoc = ref({
        paraules: [],
        indexParaulaActiva: 0,
        textEntrat: '',
        stats: [],
        errorTotal: 0,
        completedWords: 0, // Contador de palabras completadas para power-ups
    });

    // === AÑADIDO === (Refs para animación y audio)
    const meteorWordEl = ref(null);
    const shipShotEl = ref(null);
    const isShooting = ref(false);
    const shotStyle = ref({});
    const isMeteorBroken = ref(false);
    let audioDisparo = null;
    let audioExplosion = null; // === AÑADIDO PARA SONIDO EXPLOSIÓN ===

    const timeLeft = ref(props.roomState?.time ?? 0);
    const score = computed(() => {
        const nameToFind = playerName.value;
        const player = jugadoresStore.value.find(j => j.name === nameToFind);
        return player ? player.score : 0;
    });
    let gameInterval = null;
    const gameEnded = ref(false);

    onMounted(async () => {
      // Modificado para 'powerUps', pero mantenemos la lógica de montaje.
      await communicationManager.updatePlayerPage('powerUps');
      console.log('PowerUps.vue mounted. roomState:', props.roomState);
      communicationManager.onReceivePowerUp(handlePowerUp);
    });

    onUnmounted(() => {
        communicationManager.offReceivePowerUp(handlePowerUp);
        if (gameInterval) {
            clearInterval(gameInterval);
        }
    });

    watch([() => props.words, () => props.roomState?.isPlaying], ([newWords, newIsPlaying]) => {
      console.log('PowerUps.vue watch triggered. props.wordsLoaded:', props.wordsLoaded, 'newWords:', newWords, 'newIsPlaying:', newIsPlaying, 'gameEnded:', gameEnded.value);
      if (props.wordsLoaded && newWords && newIsPlaying && !gameEnded.value) {
        console.log('Words loaded and game is playing. Initializing game.');
        initializeGame();
      } else {
        console.log('Conditions not met for initializeGame in PowerUps.vue.');
      }
    }, { immediate: true, deep: true });

    // === AÑADIDO === (Watch para reiniciar la animación del meteorito)
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
        // La lógica de 'powerUps' ya está aquí, así que solo llamamos a las funciones.
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
            notificationStore.pushNotification({ type: 'error', message: 'No se han podido cargar las palabras para la partida.' });
            estatDelJoc.value.paraules = [];
            return;
        }

        let allWords = [];
        if (wordsData.facil) allWords = allWords.concat(wordsData.facil.map(word => ({ text: word, originalText: word, difficulty: 'facil' })));
        if (wordsData.normal) allWords = allWords.concat(wordsData.normal.map(word => ({ text: word, originalText: word, difficulty: 'normal' })));
        if (wordsData.dificil) allWords = allWords.concat(wordsData.dificil.map(word => ({ text: word, originalText: word, difficulty: 'dificil' })));

        for (let i = allWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
        }

        estatDelJoc.value.paraules = allWords.map(p => ({ ...p, errors: 0, estat: 'pendent' }));
        estatDelJoc.value.indexParaulaActiva = 0;
        estatDelJoc.value.textEntrat = '';
    };

    watch([() => props.words, () => props.roomState?.isPlaying], ([newWords, newIsPlaying]) => {
      console.log('PowerUps.vue watch triggered. props.wordsLoaded:', props.wordsLoaded, 'newWords:', newWords, 'newIsPlaying:', newIsPlaying, 'gameEnded:', gameEnded.value);
      if (props.wordsLoaded && newWords && newIsPlaying && !gameEnded.value) {
        console.log('Words loaded and game is playing. Initializing game.');
        initializeGame();
      } else {
        console.log('Conditions not met for initializeGame in PowerUps.vue.');
      }
    }, { immediate: true, deep: true });

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
                notificationStore.pushNotification({
                    type: 'error',
                    message: 'No se pudieron guardar las estadísticas de la partida.',
                });
            }
        }

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

    let temps = 0;
    function cronometro() {
        temps = Date.now();
    }

    function obtenirClasseLletra(lletra, index) {
        const entrada = estatDelJoc.value.textEntrat[index];
        if (!entrada) return '';
        return lletra === entrada ? 'lletra-correcta' : 'lletra-incorrecta';
    };

    // Función para activar la animación de "shake"
    function triggerShake() {
        // === MODIFICADO: Ahora apuntamos al wrapper interno ===
        const meteor = meteorWordEl.value ? meteorWordEl.value.querySelector('.shakable-wrapper') : null;
        
        if (meteor) {
            meteor.classList.remove('shake-animation');
            void meteor.offsetWidth; 
            meteor.classList.add('shake-animation');

            setTimeout(() => {
                if (meteor) { 
                    meteor.classList.remove('shake-animation');
                }
            }, 500); 
        }
    }

    // Función 'validarProgres'
    async function validarProgres() {
        const entrada = estatDelJoc.value.textEntrat.toLowerCase();
        estatDelJoc.value.textEntrat = entrada;

        if (entrada.length === 1 && temps === 0){
            cronometro();
        };

        const paraula = paraulaActiva.value;

        if (!paraula) {
            return;
        }

        for (let i = 0; i < entrada.length; i++){
            paraula._errors = paraula._errors || [];

            if(entrada[i] !== paraula.text[i] && !paraula._errors[i]){
                paraula.errors++;
                estatDelJoc.value.errorTotal++;
                paraula._errors[i] = true;

                // === ELIMINADO: triggerShake() ya no se llama aquí ===

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
                estatDelJoc.value.completedWords++;
                
                let pointsForWord = POINTS_PER_DIFFICULTY[paraula.difficulty];
                const isPowerUpTurn = estatDelJoc.value.completedWords > 0 && estatDelJoc.value.completedWords % 5 === 0;
                const noErrorsInWord = paraula.errors === 0;

                if (isPowerUpTurn && noErrorsInWord) {
                    pointsForWord *= 2; 
                    activatePowerUp(); 
                    notificationStore.pushNotification({
                        type: 'success',
                        message: `¡Power-up por palabra perfecta! Puntuación x2.`
                    });
                }

                try {
                    const newScore = score.value + pointsForWord;
                    await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
                } catch (e) {
                    console.warn('Error updating score on word completion:', e);
                }
                
                estatDelJoc.value.stats.push({
                    paraula: paraula.originalText,
                    errors: paraula.errors
                });
                paraula.estat = 'completada';
                estatDelJoc.value.indexParaulaActiva++;
                estatDelJoc.value.textEntrat = '';

                if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
                    initializeWords(props.words); 
                }
            }, 300); 
        };
    };

    // Función de disparo
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

    // MODIFICADO PARA SONIDO EXPLOSIÓN
    async function handleAnimationEnd(event) {
       
       if (event.animationName !== 'fallDown') {
           return;
       }
       
       if (isMeteorBroken.value) {
           return;
       }

       console.log("¡Tiempo agotado para la palabra! Penalización.");

       // 3. Reproducir sonido de explosión
       if (!audioExplosion) {
           audioExplosion = new Audio('/src/sound/meteoritoDestruido.mp3'); 
           audioExplosion.volume = 1.0; 
       }
       try {
           audioExplosion.currentTime = 0;
           await audioExplosion.play();
       } catch (e) {
           console.warn("No se pudo reproducir el sonido de explosión:", e);
       }

       isMeteorBroken.value = true;

       try {
           const newScore = Math.max(0, score.value - PENALTY_PER_TIMEOUT);
           await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
       } catch (e) {
           console.warn('Error applying penalty score for meteor end:', e);
       }
       
       setTimeout(() => {
           estatDelJoc.value.indexParaulaActiva++;
           estatDelJoc.value.textEntrat = '';
   
           if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
               initializeWords(props.words);
           }
       }, 300); 
    }

    async function activatePowerUp() {
        try {
            console.log('Activating power-up!');
            await communicationManager.sendPowerUp({
                roomId: roomStore.roomId,
                powerUpType: 'SCRAMBLE_WORD'
            });
            notificationStore.pushNotification({
                type: 'info',
                message: 'Power-up activado! Has mezclado las palabras de tus oponentes.'
            });
        } catch (error) {
            console.error("Error activating power-up:", error);
            notificationStore.pushNotification({
                type: 'error',
                message: 'No se pudo activar el power-up.',
            });
        }
    }

    function handlePowerUp(powerUpData) {
        if (powerUpData.powerUpType === 'SCRAMBLE_WORD') {
            scrambleCurrentWord();
        }
    }

    function scrambleWord(word) {
        let a = word.split(""),
            n = a.length;

        for(let i = n - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a.join("");
    }

    function scrambleCurrentWord() {
        const activeWord = paraulaActiva.value;
        if (activeWord) {
            const scrambled = scrambleWord(activeWord.text);
            estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva].text = scrambled;
            
            // === AÑADIDO: Llamada a "shake" en el sitio correcto ===
            triggerShake();

            notificationStore.pushNotification({
                type: 'warning',
                message: '¡Un oponente ha mezclado tu palabra!'
            });
        }
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
            <h2>Power-Ups!</h2>

            <div v-if="!gameEnded">
                <div class="game-info">
                    <p>Temps restant: {{ timeLeft }}s</p>
                    <p>Puntuació: {{ score }}</p>
                    <p>Paraules completades: {{ estatDelJoc.completedWords }}</p>
                </div>
                <main class="joc" v-if="estatDelJoc.paraules.length > 0">
                    <div class="game-content-wrapper">
                        <div class="paraula-actual">
                            
                            <h1 ref="meteorWordEl" 
                                :class="['fall-animation', { 'broken-animation': isMeteorBroken }]"
                                @animationend="handleAnimationEnd($event)">
                                
                                <span class="shakable-wrapper">
                                    <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                                        {{ lletra }}
                                    </span>
                                </span>
                            </h1>

                            <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" autofocus />
                            
                            <img v-if="playerShipSrc" :src="playerShipSrc" alt="Nave seleccionada" class="player-ship" />
                            <div v-if="isShooting" ref="shipShotEl" class="ship-shot" :style="shotStyle"></div>
                        </div>

                        <div class="puntuacions">
                            <h2>Classificació</h2>
                            <TransitionGroup tag="ul" id="llista-jugadors" name="list-ranking">
                                <li v-for="jugador in jugadoresOrdenats" 
                                    :key="jugador.name"
                                    :data-ship-model="`${jugador.avatar || 'nave'}${jugador.color || 'Azul'}`">

                                    <span>{{ jugador.name }}</span>
                                    <strong>{{ jugador.score }}</strong>
                                </li>
                            </ul>
                        </div>
                    </div>
                </main>
            </div>

            <div v-else class="game-end-screen">
                <h2>¡Juego Terminado!</h2>
                <p>Tu puntuación final: {{ score }}</p>
                <h3>Clasificación Final</h3>
                <ul id="llista-jugadors-final">
                    <li v-for="jugador in jugadoresStore" 
                        :key="jugador.name"
                        :data-ship-model="`${jugador.avatar || 'nave'}${jugador.color || 'Azul'}`">
                        
                        <strong>{{ jugador.name }}</strong> - {{ jugador.score }} punts - {{ jugador.wpm ? jugador.wpm.toFixed(2) : 0 }} WPM
                    </li>
                </ul>
                <button class="btn" @click="backToLobby">Volver al Lobby</button>
            </div>
        </div>
    </div>
</template>

<style src="../../styles/stylesCuentaAtrasSimple.css"></style>