<script setup>
    import { ref, computed, onMounted, watch, onUnmounted, toRefs } from 'vue';
    import { communicationManager } from '../communicationManager';

    const POINTS_PER_DIFFICULTY = {
        facil: 5,
        normal: 10,
        dificil: 15,
    };

    const GAME_WORD_COUNT = 10; // Número fijo de palabras por juego

    const emits = defineEmits(['done']);
    
    const props = defineProps({
        words: Object,
        playerName: String,
        jugadores: Array // Added jugadores prop
    });

    const { words } = toRefs(props); // Desestructurar words de props
    
    const estatDelJoc = ref({
        paraules: [],
        indexParaulaActiva: 0,
        textEntrat: '',
        stats: [],
        errorTotal: 0,
    });

    const timeLeft = ref(30); // 30 segundos para el contador
    const score = ref(0);
    let gameInterval = null;
    const gameEnded = ref(false);

    onMounted(() => {
        console.log('joc.vue mounted. words:', words.value);
        if (words.value) {
            initializeWords(words.value);
            startGameTimer();
        }
    });

    onUnmounted(() => {
        clearInterval(gameInterval);
    });

    watch(words, (newWords) => {
        console.log('joc.vue - words changed:', newWords);
        if (newWords) {
            initializeWords(newWords);
            startGameTimer();
        }
    });

    const initializeWords = (wordsData) => {
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

        // Shuffle and select GAME_WORD_COUNT words
        const shuffledWords = allWords.sort(() => 0.5 - Math.random());
        estatDelJoc.value.paraules = shuffledWords.slice(0, GAME_WORD_COUNT).map((word, index) => ({
            id: index,
            text: word.text,
            estat: 'pendent',
            errors: 0,
            difficulty: word.difficulty,
        }));
        estatDelJoc.value.indexParaulaActiva = 0;
        estatDelJoc.value.textEntrat = '';
    };

    const startGameTimer = () => {
        if (gameInterval) clearInterval(gameInterval);
        timeLeft.value = 10; // Reset timer
        gameEnded.value = false;
        score.value = 0; // Reset score

        gameInterval = setInterval(() => {
            timeLeft.value--;
            if (timeLeft.value <= 0) {
                clearInterval(gameInterval);
                gameEnded.value = true;
                // Aquí se podría emitir un evento de fin de juego a GameEngine
            }
        }, 1000);
    };

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
                    score.value += POINTS_PER_DIFFICULTY[paraula.difficulty]; // Sumar puntos según la dificultad
                    communicationManager.updateScore(props.playerName, score.value); // Enviar puntuación al backend
                    estatDelJoc.value.stats.push({
                        paraula: paraula.text,
                        errors: paraula.errors
                    });            paraula.estat = 'completada';
            estatDelJoc.value.indexParaulaActiva++;
            estatDelJoc.value.textEntrat = '';

            // Si no hay más palabras, terminar el juego
            if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
                clearInterval(gameInterval);
                gameEnded.value = true;
            }
        };
    };

    const backToLobby = () => {
        console.log('Emitting done event');
        emits('done');
    };
</script>

<template>
    <div class="game-container">
        <h2>Ànims, {{ playerName }}!</h2>

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
                            <li v-for="jugador in props.jugadores" :key="jugador.name">
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
                <li v-for="jugador in props.jugadores" :key="jugador.name">
                    <strong>{{ jugador.name }}</strong> - {{ jugador.score }} punts
                </li>
            </ul>
            <button class="lobby-button" @click="backToLobby">Volver al Lobby</button>
        </div>
    </div>
</template>

<style src="../styles/stylesJoc.css"></style>