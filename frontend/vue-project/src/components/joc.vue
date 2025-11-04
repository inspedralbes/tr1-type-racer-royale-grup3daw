<script setup>
    // Importaciones de Vue para la reactividad y gestión del ciclo de vida del componente.
    import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
    // Importación de Pinia para desestructurar propiedades reactivas de los stores.
    import { storeToRefs } from 'pinia';
    // Importación del gestor de comunicación para interactuar con el backend.
    import { communicationManager } from '../communicationManager';
    // Importación de los stores de Pinia para la gestión del estado global de la aplicación.
    import { useGameStore } from '../stores/game';
    import { useRoomStore } from '../stores/room';

    // Inicialización de los stores.
    const gameStore = useGameStore();
    const roomStore = useRoomStore();

    // Desestructuración de propiedades reactivas de los stores.
    const { nombreJugador, words } = storeToRefs(gameStore);
    const { jugadores, roomState, remainingTime } = storeToRefs(roomStore);

    // Definición de puntos por dificultad de palabra.
    const POINTS_PER_DIFFICULTY = {
        facil: 5,
        normal: 10,
        dificil: 15,
    };

    const GAME_WORD_COUNT = 10; // Número fijo de palabras por juego.

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

    // Tiempo restante para el juego, inicializado con el tiempo de la sala.
    const timeLeft = ref(roomState.value.time || 0);
    // Puntuación del jugador actual, computada a partir del store de la sala.
    const score = computed(() => {
        const player = jugadores.value.find(j => j.name === nombreJugador.value);
        return player ? player.score : 0;
    });
    let gameInterval = null; // Variable para almacenar el ID del intervalo del juego.
    const gameEnded = ref(false); // Estado para controlar si el juego ha terminado.

    // Hook `onMounted` que se ejecuta cuando el componente ha sido montado.
    onMounted(() => {
        console.log('joc.vue mounted. roomState:', roomState.value);
        // Si el juego ya está en curso y tiene un tiempo de inicio, inicializa el juego.
        if (roomState.value.isPlaying && roomState.value.gameStartTime) {
            initializeGame();
        }
    });

    // Hook `onUnmounted` que se ejecuta cuando el componente va a ser desmontado.
    onUnmounted(() => {
        // Limpia el intervalo del juego para evitar fugas de memoria.
        clearInterval(gameInterval);
    });

    // Observa si el juego comienza (cuando `isPlaying` pasa a `true`).
    watch(() => roomState.value.isPlaying, (newIsPlaying, oldIsPlaying) => {
        if (newIsPlaying && !oldIsPlaying) {
            console.log('El juego ha comenzado. Inicializando...');
            initializeGame();
        }
    });

    /**
     * @description Inicializa el juego, cargando las palabras y comenzando el temporizador.
     */
    function initializeGame() {
        initializeWords(words.value);
        startGameTimer();
    }

    /**
     * @description Sincroniza el temporizador del juego con el tiempo restante real.
     */
    const initializeTimer = () => {
        const now = Date.now();
        const startTime = roomState.value.gameStartTime;
        if (!startTime) {
            timeLeft.value = roomState.value.time;
            return;
        }
        const totalDurationMs = roomState.value.time * 1000;
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
     * @description Inicializa las palabras para el juego, mezclándolas y seleccionando un número fijo.
     * @param {Object} wordsData - Objeto que contiene arrays de palabras por dificultad (facil, normal, dificil).
     */
    const initializeWords = (wordsData) => {
        if (!wordsData) {
            console.error("initializeWords: wordsData es nulo o indefinido.");
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

        // Asigna un subconjunto de palabras al estado del juego y las inicializa.
        estatDelJoc.value.paraules = allWords.slice(0, GAME_WORD_COUNT).map(p => ({ ...p, errors: 0, estat: 'pendent' }));
        estatDelJoc.value.indexParaulaActiva = 0;
        estatDelJoc.value.textEntrat = ''; // Limpia el campo de entrada.
    };

    /**
     * @description Finaliza el juego, detiene el temporizador y emite los resultados.
     */
    function finishGame(){
        if(gameInterval){
            clearInterval(gameInterval);
            gameInterval = null;
        }
        gameEnded.value = true;

        const resultados = {
            jugador: nombreJugador.value,
            puntuacion: score.value,
            stats: [...estatDelJoc.value.stats],
            errorTotal: estatDelJoc.value.errorTotal,
        }
        emits('done', resultados);
    }

    /**
     * @description Propiedad computada que devuelve la palabra activa actual.
     * @returns {Object} - La palabra actual con su texto, dificultad, errores y estado.
     */
    const paraulaActiva = computed(() => {
        return estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva];
    });

    // Computed: next up to 4 words that the player will have to type after the active one
    const nextWords = computed(() => {
        const start = estatDelJoc.value.indexParaulaActiva + 1;
        if (!estatDelJoc.value.paraules || estatDelJoc.value.paraules.length === 0) return [];
        return estatDelJoc.value.paraules.slice(start, start + 4).map(p => p.text);
    });

    // Stack of word objects to render inside the active-word box.
    // Order: top = furthest upcoming, bottom = current active word (so the next word is just above the current)
    const stackWords = computed(() => {
        const list = [];
        const baseIndex = estatDelJoc.value.indexParaulaActiva;
        if (!estatDelJoc.value.paraules) return list;
        // push up to 4 upcoming, from furthest to nearest (so nearest is just above current)
        for (let i = baseIndex + 4; i > baseIndex; i--) {
            if (i < estatDelJoc.value.paraules.length) {
                list.push({ id: i, text: estatDelJoc.value.paraules[i].text });
            }
        }
        // finally push current at the bottom
        if (baseIndex < estatDelJoc.value.paraules.length) {
            list.push({ id: baseIndex, text: estatDelJoc.value.paraules[baseIndex].text });
        }
        return list;
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
    function validarProgres() {
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
                paraula.errors++;
                estatDelJoc.value.errorTotal++;
                paraula._errors[i] = true;
            };
                };
                // Si la palabra introducida coincide exactamente con la palabra activa.
                if (entrada === paraula.text){
                    // Actualiza la puntuación del jugador en el backend.
                    communicationManager.updateScore(nombreJugador.value, score.value + POINTS_PER_DIFFICULTY[paraula.difficulty], roomStore.roomId);
                    // Registra las estadísticas de la palabra completada.
                    estatDelJoc.value.stats.push({
                        paraula: paraula.text,
                        errors: paraula.errors
                    });            paraula.estat = 'completada';
            estatDelJoc.value.indexParaulaActiva++;
            estatDelJoc.value.textEntrat = '';

            // Si no hay más palabras, termina el juego.
            if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
                finishGame();
            }
        };
    };

    // Si el tiempo restante es cero, finaliza el juego (redundante con el setInterval, pero como fallback).
    if (startGameTimer.timeLeft <= 0){
        finishGame();
    }

    /**
     * @description Navega de vuelta al lobby. Emite un evento 'done' al componente padre.
     */
    const backToLobby = () => {
        console.log('Emitting done event');
        emits('done');
    };
</script>

<template>
    <!-- Contenedor principal del juego con un fondo específico. -->
    <div class="joc-background">
        <div class="game-container">
            <!-- Contenido del juego mientras no ha terminado. -->
            <div v-if="!gameEnded">
                <!-- Botón para regresar al lobby. -->
                <main class="joc" v-if="estatDelJoc.paraules.length > 0">
                    <div class="game-content-wrapper">
                        <button class="back-button" @click="backToLobby">←</button>
                        <!-- Left info column -->
                        <div class="game-info-left">
                            <p>Tiempo restante: {{ timeLeft }}s</p>
                            <p>Puntuación: {{ score }}</p>
                        </div>
                        <!-- Center column: preview above the active word -->
                        <div class="center-column">
                            <div class="paraula-actual">
                                <!-- Stack: top = furthest upcoming, bottom = current word -->
                                <transition-group name="stack" tag="div" class="stack-container">
                                    <div class="stack-item" v-for="w in stackWords" :key="w.id" :class="{ current: w.id === estatDelJoc.indexParaulaActiva }">{{ w.text }}</div>
                                </transition-group>

                                <!-- keep an accessible hidden H1 for letter-by-letter classes if needed -->
                                <h1 class="visually-hidden">
                                    <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                                        {{ lletra }}
                                    </span>
                                </h1>

                                <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" autofocus />
                            </div>
                        </div>
                        <!-- Right: player scores -->
                        <div class="puntuacions">
                            <h2>Classificació</h2>
                            <ul id="llista-jugadors">
                                <li v-for="jugador in jugadores" :key="jugador.name">
                                    <strong>{{ jugador.name }}</strong> - {{ jugador.score }} punts
                                </li>
                            </ul>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    </div>
    
</template>

<!-- Importa los estilos específicos para el componente de juego. -->
<style src="../styles/stylesJoc.css"></style>