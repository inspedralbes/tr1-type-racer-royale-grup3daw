<script setup>
    // === MODIFICADO ===
    // Importaciones de Vue para la reactividad y gestión del ciclo de vida del componente.
    // Añadido 'nextTick' para manejar el reinicio de la animación
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
    
                // Definición de props para el componente (hacer opcionales y dar valores por defecto
                // para evitar errores si el padre no las pasa inmediatamente).
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
        const router = useRouter();
    
    // Desestructuración de propiedades reactivas de los stores.
    const { jugadores: jugadoresStore, remainingTime } = storeToRefs(roomStore);
    const { nombreJugador } = storeToRefs(gameStore);

    // Computed playerName to prefer prop but fall back to store value if prop missing
    const playerName = computed(() => props.playerName || nombreJugador.value || '');

    const currentGameMode = computed(() => props.gameMode);

    // Definición de puntos por dificultad de palabra.
    const POINTS_PER_DIFFICULTY = {
        facil: 5,
        normal: 10,
        dificil: 15,
    };
    const PENALTY_PER_ERROR = 1; // Puntos que se restan por cada error detectado

    // No limit on words: use the full word list and keep recycling when exhausted.

    // Declaración de eventos que este componente puede emitir.
    const emits = defineEmits(['done']);
    
    // Estado reactivo local para la gestión del juego.
    const estatDelJoc = ref({
        paraules: [], // Array de palabras para el juego.
        indexParaulaActiva: 0, // Índice de la palabra actual.
        textEntrat: '', // Texto introducido por el usuario.
        stats: [], // Estadísticas de palabras completadas.
        errorTotal: 0, // Contador total de errores.
    });

    // === AÑADIDO ===
    // Referencia al elemento <h1> del meteorito/palabra
    const meteorWordEl = ref(null);

    // Tiempo restante para el juego, inicializado con el tiempo de la sala.
    const timeLeft = ref(props.roomState?.time ?? 0);
    // Puntuación del jugador actual, computada a partir del store de la sala.
    const score = computed(() => {
        const nameToFind = playerName.value;
        const player = jugadoresStore.value.find(j => j.name === nameToFind);
        return player ? player.score : 0;
    });
    let gameInterval = null; // Variable para almacenar el ID del intervalo del juego.
    const gameEnded = ref(false); // Estado para controlar si el juego ha terminado.

    // Hook `onMounted` que se ejecuta cuando el componente ha sido montado.
    onMounted(async () => {
      await communicationManager.updatePlayerPage('cuentaAtrasSimple');
      console.log('CuentaAtrasSimple.vue mounted. roomState:', props.roomState);
      console.log('CuentaAtrasSimple.vue mounted. props.wordsLoaded:', props.wordsLoaded); // Add this line
    });

    // === BLOQUE DE FUNCIONES MOVIDO ARRIBA ===
    // Se mueven las declaraciones de funciones antes de los `watch` que las utilizan
    // para evitar errores de "Cannot access before initialization".

    /**
     * @description Inicializa las palabras para el juego, mezclándolas y seleccionando un número fijo.
     * @param {Object} wordsData - Objeto que contiene arrays de palabras por dificultad (facil, normal, dificil).
     */
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
        // Concatena las palabras de cada dificultad con su etiqueta.
        if (wordsData.facil) {
            allWords = allWords.concat(wordsData.facil.map(word => ({ text: word, difficulty: 'facil' })));
        }
        if (wordsData.normal) {
            allWords = allWords.concat(wordsData.normal.map(word => ({ text: word, difficulty: 'normal' })));
        }
        if (wordsData.dificil) {
            allWords = allWords.concat(wordsData.dificil.map(word => ({ text: word, difficulty: 'dificil' })));
        }

        // Mezcla las palabras aleatoriamente.
        for (let i = allWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
        }

        // Usa TODAS las palabras disponibles; no hay límite fijo por juego.
        estatDelJoc.value.paraules = allWords.map(p => ({ ...p, errors: 0, estat: 'pendent' }));
        estatDelJoc.value.indexParaulaActiva = 0;
        estatDelJoc.value.textEntrat = ''; // Limpia el campo de entrada.
    };

    /**
     * @description Sincroniza el temporizador del juego con el tiempo restante real.
     */
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

    /**
     * @description Inicia el temporizador del juego, actualizando `timeLeft` cada segundo.
     * Cuando el tiempo llega a cero, finaliza el juego.
     */
    const startGameTimer = () => {
        if (gameInterval) clearInterval(gameInterval); // Limpiar cualquier intervalo anterior.
        initializeTimer(); // Sincronizar tiempo al iniciar.

        gameInterval = setInterval(() => {
            timeLeft.value--;
            if (timeLeft.value <= 0) {
                // Al expirar el tiempo, terminar partida y notificar al padre.
                clearInterval(gameInterval);
                gameInterval = null;
                finishGame();
            }
        }, 1000);
    };

    /**
     * @description Inicializa el juego, cargando las palabras y comenzando el temporizador.
     */
    function initializeGame() {
        switch (currentGameMode.value) {
            case 'cuentaAtrasSimple':
                initializeWords(props.words);
                startGameTimer();
                break;
            case 'modoJuego2':
                // Lógica de inicialización para el modo de juego 2
                console.log('Initializing Modo de Juego 2');
                break;
            case 'modoJuego3':
                // Lógica de inicialización para el modo de juego 3
                console.log('Initializing Modo de Juego 3');
                break;
            default:
                console.warn('Modo de juego desconocido:', currentGameMode.value);
                initializeWords(props.words);
                startGameTimer();
        }
    }

        // Observa cuando las palabras están cargadas y el juego está activo para inicializar.
        watch([() => props.words, () => props.roomState?.isPlaying], ([newWords, newIsPlaying]) => {
      console.log('CuentaAtrasSimple.vue watch triggered. props.wordsLoaded:', props.wordsLoaded, 'newWords:', newWords, 'newIsPlaying:', newIsPlaying, 'gameEnded:', gameEnded.value);
      if (props.wordsLoaded && newWords && newIsPlaying && !gameEnded.value) {
        console.log('Words loaded and game is playing. Initializing game.');
        initializeGame();
      } else {
        console.log('Conditions not met for initializeGame.');
      }
    }, { immediate: true, deep: true });

    // === AÑADIDO ===
    /**
     * @description Observador que se activa CADA VEZ que cambia la palabra (indexParaulaActiva).
     * Se encarga de reiniciar la animación de caída.
     */
    watch(() => estatDelJoc.value.indexParaulaActiva, async () => {
        // Esperamos a que Vue actualice el DOM con el contenido de la nueva palabra
        await nextTick(); 
        
        if (meteorWordEl.value) {
            // 1. Quitar la clase de animación
            meteorWordEl.value.classList.remove('fall-animation');
            // 2. Forzar un "reflow" (truco para que el navegador "olvide" la animación)
            void meteorWordEl.value.offsetWidth; 
            // 3. Volver a añadir la clase para que se reproduzca de nuevo
            meteorWordEl.value.classList.add('fall-animation');
        }
    });

    /**
     * @description Finaliza el juego, detiene el temporizador y emite los resultados.
     */
    async function finishGame(){
        if(gameInterval){
            clearInterval(gameInterval);
            gameInterval = null;
        }
        gameEnded.value = true;

        const totalTypedChars = estatDelJoc.value.stats.reduce((acc, word) => acc + word.paraula.length, 0);
        const gameDurationInMinutes = props.roomState.time / 60;
        const wpm = gameDurationInMinutes > 0 ? (totalTypedChars / 5) / gameDurationInMinutes : 0;

        // Prepara y envía las estadísticas detalladas del juego.
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
            case 'cuentaAtrasSimple':
                const finalScores = jugadoresStore.value.map(p => ({
                    nombre: p.name,
                    puntuacion: p.score,
                    wpm: p.wpm,
                }));
                gameStore.setFinalResults(finalScores);
                sessionStore.setEtapa('done');
                break;
            case 'modoJuego2':
                // Lógica de finalización para el modo de juego 2
                console.log('Finishing Modo de Juego 2');
                sessionStore.setEtapa('done'); // O la etapa final que corresponda
                break;
            case 'modoJuego3':
                // Lógica de finalización para el modo de juego 3
                console.log('Finishing Modo de Juego 3');
                sessionStore.setEtapa('done'); // O la etapa final que corresponda
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

    /**
     * @description Propiedad computada que devuelve la palabra activa actual.
     * @returns {Object} - La palabra actual con su texto, dificultad, errores y estado.
     */
    const paraulaActiva = computed(() => {
        return estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva];
    });

    // Computed para obtener la URL de la nave/avatar del jugador actual
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
    /**
     * @description Inicia el cronómetro para medir el tiempo de escritura de una palabra.
     */
    function cronometro() {
        temps = Date.now();
    }

    /**
     * @description Obtiene la clase CSS para una letra individual, indicando si es correcta o incorrecta.
     * @param {string} lletra - La letra a evaluar.
     * @param {number} index - El índice de la letra dentro de la palabra.
     * @returns {string} - Clase CSS ('lletra-correcta', 'lletra-incorrecta') o cadena vacía.
     */
    function obtenirClasseLletra(lletra, index) {
        const entrada = estatDelJoc.value.textEntrat[index];
        if (!entrada) return '';
        return lletra === entrada ? 'lletra-correcta' : 'lletra-incorrecta';
        };

    /**
     * @description Valida el progreso de escritura del usuario, actualiza errores y puntuación.
     * Avanza a la siguiente palabra si la actual se completa correctamente.
     */
    async function validarProgres() {
        const entrada = estatDelJoc.value.textEntrat.toLowerCase();
        estatDelJoc.value.textEntrat = entrada;

        // Inicia el cronómetro cuando el usuario empieza a escribir la primera letra.
        if (entrada.length === 1 && temps === 0){
            cronometro();
        };

        const paraula = paraulaActiva.value;

        // Compara cada letra introducida con la palabra activa para detectar errores.
        for (let i = 0; i < entrada.length; i++){
            paraula._errors = paraula._errors || [];

            if(entrada[i] !== paraula.text[i] && !paraula._errors[i]){
                // Se detecta un nuevo error sobre la letra i: contabilizar y aplicar penalización
                paraula.errors++;
                estatDelJoc.value.errorTotal++;
                paraula._errors[i] = true;

                try {
                    // Calculamos la nueva puntuación y la enviamos al servidor
                    const newScore = Math.max(0, score.value - PENALTY_PER_ERROR);
                    await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
                } catch (e) {
                    console.warn('Error applying penalty score:', e);
                }
            };
                };
                // Si la palabra introducida coincide exactamente con la palabra activa.
                if (entrada === paraula.text){
                    // Actualiza la puntuación del jugador en el backend.
                    try {
                        const newScore = score.value + POINTS_PER_DIFFICULTY[paraula.difficulty];
                        await communicationManager.updateScore(playerName.value, newScore, roomStore.roomId);
                    } catch (e) {
                        console.warn('Error updating score on word completion:', e);
                    }
                    // Registra las estadísticas de la palabra completada.
                    estatDelJoc.value.stats.push({
                        paraula: paraula.text,
                        errors: paraula.errors
                    });            paraula.estat = 'completada';
            estatDelJoc.value.indexParaulaActiva++;
            estatDelJoc.value.textEntrat = '';

            // Si llegamos al final de la lista de palabras, simplemente remezclamos
            // y continuamos para no imponer un límite por número de palabras.
            if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
                // Re-shuffle the current words set and restart index at 0 so the player
                // can continue typing new words until the timer runs out.
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
                    // Si no hay datos de palabras, finalizamos por seguridad.
                    finishGame();
                }
            }
        };
    };

    // Si el tiempo restante es cero, finaliza el juego (redundante con el setInterval, pero como fallback).
    if (timeLeft.value <= 0){
        finishGame();
    }

    /**
     * @description Navega de vuelta al lobby. Emite un evento 'done' al componente padre.
     */
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
            <main class="joc" v-if="estatDelJoc.paraules.length > 0">
                <div class="game-content-wrapper">
                    <div class="paraula-actual">
                        
                        <h1 ref="meteorWordEl">
                            <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                                {{ lletra }}
                            </span>
                        </h1>
                        <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" autofocus />
                        <img v-if="playerShipSrc" :src="playerShipSrc" alt="Nave seleccionada" class="player-ship" />
                    </div>

                    <div class="puntuacions">
                                <h2>Classificació</h2>
                        <ul id="llista-jugadors">
                            <li v-for="jugador in jugadoresStore" :key="jugador.name">
                                <strong>{{ jugador.name }}</strong> - {{ jugador.score }} punts
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
                <li v-for="jugador in jugadoresStore" :key="jugador.name">
                    <strong>{{ jugador.name }}</strong> - {{ jugador.score }} punts - {{ jugador.wpm ? jugador.wpm.toFixed(2) : 0 }} WPM
                </li>
            </ul>
            <button class="btn" @click="backToLobby">Volver al Lobby</button>
        </div>
    </div>
    </div>
    
</template>

<style src="../../styles/stylesCuentaAtrasSimple.css"></style>