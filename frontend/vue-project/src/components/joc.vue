<script setup>
    import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
    import { storeToRefs } from 'pinia';
    import { communicationManager } from '../communicationManager';
    import { useGameStore } from '../stores/game';
    import { useRoomStore } from '../stores/room';

    const gameStore = useGameStore();
    const roomStore = useRoomStore();

    const { nombreJugador, words } = storeToRefs(gameStore);
    const { jugadores, roomState, remainingTime } = storeToRefs(roomStore);

    const POINTS_PER_DIFFICULTY = {
        facil: 5,
        normal: 10,
        dificil: 15,
    };

    const GAME_WORD_COUNT = 10; // Número fijo de palabras por juego

    const emits = defineEmits(['done']);
    
    const estatDelJoc = ref({
        paraules: [],
        indexParaulaActiva: 0,
        textEntrat: '',
        stats: [],
        errorTotal: 0,
    });

    const timeLeft = ref(roomState.value.time || 0);
    const score = computed(() => {
        const player = jugadores.value.find(j => j.name === nombreJugador.value);
        return player ? player.score : 0;
    });
    let gameInterval = null;
    const gameEnded = ref(false);

    onMounted(() => {
        console.log('joc.vue mounted. roomState:', roomState.value);
        if (roomState.value.isPlaying && roomState.value.gameStartTime) {
            initializeGame();
        }
    });

    onUnmounted(() => {
        clearInterval(gameInterval);
    });

    // Observa si el juego comienza (cuando isPlaying pasa a true)
    watch(() => roomState.value.isPlaying, (newIsPlaying, oldIsPlaying) => {
        if (newIsPlaying && !oldIsPlaying) {
            console.log('El juego ha comenzado. Inicializando...');
            initializeGame();
        }
    });

    function initializeGame() {
        initializeWords(words.value);
        startGameTimer();
    }

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

    const startGameTimer = () => {
        if (gameInterval) clearInterval(gameInterval); // Limpiar cualquier intervalo anterior
        initializeTimer(); // Sincronizar tiempo al iniciar

        gameInterval = setInterval(() => {
            timeLeft.value--;
            if (timeLeft.value <= 0) {
                // Al expirar el tiempo, terminar partida y notificar al padre
                clearInterval(gameInterval);
                gameInterval = null;
                finishGame();
            }
        }, 1000);
    };

    const initializeWords = (wordsData) => {
        if (!wordsData) {
            console.error("initializeWords: wordsData es nulo o indefinido.");
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

        // Mezclar las palabras
        for (let i = allWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
        }

        // Asignar al estado del juego
        estatDelJoc.value.paraules = allWords.slice(0, GAME_WORD_COUNT).map(p => ({ ...p, errors: 0, estat: 'pendent' }));
        estatDelJoc.value.indexParaulaActiva = 0;
        estatDelJoc.value.textEntrat = ''; // Limpiar input
    };

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

    const paraulaActiva = computed(() => {
        return estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva];
    });

    let temps = 0;
    function cronometro() {
        // Corregido: se llama a Date.now() para obtener el valor
        temps = Date.now();
    }

    function obtenirClasseLletra(lletra, index) {
        const entrada = estatDelJoc.value.textEntrat[index];
        if (!entrada) return '';
        return lletra === entrada ? 'lletra-correcta' : 'lletra-incorrecta';
        };

    function validarProgres() {
        const entrada = estatDelJoc.value.textEntrat.toLowerCase();
        estatDelJoc.value.textEntrat = entrada;

        if (entrada.length === 1 && temps === 0){
            cronometro(); // Corregido: se llama a la función cronometro()
        };

        const paraula = paraulaActiva.value;

        for (let i = 0; i < entrada.length; i++){
            paraula._errors = paraula._errors || [];

            if(entrada[i] !== paraula.text[i] && !paraula._errors[i]){
                paraula.errors++;
                estatDelJoc.value.errorTotal++;
                paraula._errors[i] = true;
            };
                };
                if (entrada === paraula.text){
                    communicationManager.updateScore(nombreJugador.value, score.value + POINTS_PER_DIFFICULTY[paraula.difficulty], roomStore.roomId); // Enviar puntuación al backend
                    estatDelJoc.value.stats.push({
                        paraula: paraula.text,
                        errors: paraula.errors
                    });            paraula.estat = 'completada';
            estatDelJoc.value.indexParaulaActiva++;
            estatDelJoc.value.textEntrat = '';

            // Si no hay más palabras, terminar el juego
            if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
                finishGame();
            }
        };
    };

    if (startGameTimer.timeLeft <= 0){
        finishGame();
    }

    const backToLobby = () => {
        console.log('Emitting done event');
        emits('done');
    };
</script>

<template>
    <div class="joc-background">
        <div class="game-container">
        <button class="back-button" @click="backToLobby">←</button>
        <h2>Ànims, {{ nombreJugador }}!</h2>

        <div v-if="!gameEnded">
            <p>Tiempo restante: {{ timeLeft }}s</p>
            <p>Puntuación: {{ score }}</p>
            <main class="joc" v-if="estatDelJoc.paraules.length > 0">
                <div class="game-content-wrapper">
                    <div class="paraula-actual">
                        <h1>
                            <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                                {{ lletra }}
                            </span>
                        </h1>
                        <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" autofocus />
                    </div>

                    <!-- Secció lateral amb puntuacions -->
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

        <div v-else class="game-end-screen">
            <h2>¡Juego Terminado!</h2>
            <p>Tu puntuación final: {{ score }}</p>
            <h3>Clasificación Final</h3>
            <ul id="llista-jugadors-final">
                <li v-for="jugador in jugadores" :key="jugador.name">
                    <strong>{{ jugador.name }}</strong> - {{ jugador.score }} punts
                </li>
            </ul>
            <button class="lobby-button" @click="backToLobby">Volver al Lobby</button>
        </div>
    </div>
    </div>
    
</template>

<style src="../styles/stylesJoc.css"></style>