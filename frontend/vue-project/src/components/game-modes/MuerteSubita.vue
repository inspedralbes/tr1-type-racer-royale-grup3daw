<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { socket } from '../../communicationManager';
import { useRoomStore } from '../../stores/room';
import { useSessionStore } from '../../stores/session';
import { useNotificationStore } from '../../stores/notification';

const props = defineProps({
    words: { type: Object, default: null },
    wordsLoaded: { type: Boolean, default: false },
    playerName: { type: String, default: '' },
    roomState: { type: Object, default: () => ({ isPlaying: false }) },
    gameMode: { type: String, required: true },
});

const roomStore = useRoomStore();
const sessionStore = useSessionStore();
const notificationStore = useNotificationStore();

const estatDelJoc = ref({
    paraules: [],
    indexParaulaActiva: 0,
    textEntrat: '',
});

const playersState = ref([]);
const gameEnded = ref(false);
const winner = ref(null);
const isLocked = ref(false);
const meteorWordEl = ref(null);

const myPlayerState = computed(() => {
    const p = playersState.value.find(p => p.name === props.playerName);
    return p ? p.gameData : { time: 0, isEliminated: true };
});

const isEliminated = computed(() => myPlayerState.value.isEliminated);

onMounted(() => {
    initializeWords(props.words);

    socket.on('muerte-subita-state-update', (data) => {
        playersState.value = data.players;
    });

    socket.on('player-eliminated', (data) => {
        const player = playersState.value.find(p => p.socketId === data.playerId);
        if (player) {
            notificationStore.pushNotification({ message: `${player.name} ha sido eliminado!`, type: 'info' });
        }
    });

    socket.on('apply-debuff', (data) => {
        if (data.type === 'INPUT_LOCK') {
            isLocked.value = true;
            notificationStore.pushNotification({ message: '¡Bloqueado por un oponente!', type: 'warning' });
            setTimeout(() => {
                isLocked.value = false;
            }, data.duration);
        }
    });

    socket.on('game-over', (data) => {
        gameEnded.value = true;
        // Process final results and transition to final screen
        gameStore.setFinalResults(data.results);
        sessionStore.setEtapa('done');
    });
});

onUnmounted(() => {
    socket.off('muerte-subita-state-update');
    socket.off('player-eliminated');
    socket.off('apply-debuff');
    socket.off('game-over');
});

watch(() => props.words, (newWords) => {
    if (newWords) {
        initializeWords(newWords);
    }
}, { immediate: true });

watch(() => estatDelJoc.value.indexParaulaActiva, async () => {
    await nextTick();
    if (meteorWordEl.value) {
        meteorWordEl.value.classList.remove('fall-animation');
        void meteorWordEl.value.offsetWidth;
        meteorWordEl.value.classList.add('fall-animation');
    }
});

const initializeWords = (wordsData) => {
    if (!wordsData) return;
    let allWords = [
        ...wordsData.facil.map(word => ({ text: word, difficulty: 'facil' })),
        ...wordsData.normal.map(word => ({ text: word, difficulty: 'normal' })),
        ...wordsData.dificil.map(word => ({ text: word, difficulty: 'dificil' })),
    ];
    for (let i = allWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }
    estatDelJoc.value.paraules = allWords.map(p => ({ ...p, estat: 'pendent' }));
};

const paraulaActiva = computed(() => {
    return estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva];
});

const validarProgres = () => {
    const entrada = estatDelJoc.value.textEntrat.toLowerCase();
    estatDelJoc.value.textEntrat = entrada;
    const paraula = paraulaActiva.value;

    if (entrada === paraula.text) {
        socket.emit('muerte-subita-word-correct', {
            roomId: roomStore.roomId,
            difficulty: paraula.difficulty,
        });

        estatDelJoc.value.indexParaulaActiva++;
        estatDelJoc.value.textEntrat = '';

        if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
            initializeWords(props.words);
            estatDelJoc.value.indexParaulaActiva = 0;
        }
    }
};

const obtenirClasseLletra = (lletra, index) => {
    const entrada = estatDelJoc.value.textEntrat[index];
    if (!entrada) return '';
    return lletra === entrada ? 'lletra-correcta' : 'lletra-incorrecta';
};

const backToLobby = () => {
    sessionStore.setEtapa('lobby');
};
</script>

<template>
    <div class="main-background">
        <div class="game-container">
            <h2>Muerte Súbita, {{ playerName }}!</h2>

            <div v-if="!gameEnded">
                <div class="game-info">
                    <p :class="{ 'text-danger': myPlayerState.time <= 5 }">Tu tiempo: {{ myPlayerState.time }}s</p>
                    <p v-if="isLocked" class="text-warning">¡BLOQUEADO!</p>
                </div>

                <main class="joc" v-if="estatDelJoc.paraules.length > 0 && !isEliminated">
                    <div class="game-content-wrapper">
                        <div class="paraula-actual">
                            <h1 ref="meteorWordEl">
                                <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                                    {{ lletra }}
                                </span>
                            </h1>
                            <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" :disabled="isLocked || isEliminated" autofocus />
                        </div>

                        <div class="puntuacions">
                            <h2>Jugadores</h2>
                            <ul id="llista-jugadors">
                                <li v-for="player in playersState" :key="player.socketId" :class="{ 'player-eliminated': player.gameData.isEliminated }">
                                    <strong>{{ player.name }}</strong> - {{ player.gameData.isEliminated ? 'Eliminado' : `${player.gameData.time}s` }}
                                </li>
                            </ul>
                        </div>
                    </div>
                </main>
                <div v-if="isEliminated && !gameEnded" class="eliminated-overlay">
                    <h2>¡HAS SIDO ELIMINADO!</h2>
                    <p>Observa cómo el resto lucha por la supervivencia...</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.main-background {
    /* Estilos del contenedor principal del juego */
}
.game-container {
    /* Estilos del contenedor del juego */
}
.game-info p {
    font-size: 1.5rem;
    font-weight: bold;
}
.text-danger {
    color: red;
    animation: pulse 1s infinite;
}
.text-warning {
    color: orange;
}
.player-eliminated {
    text-decoration: line-through;
    opacity: 0.6;
}
.eliminated-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 2em;
    text-align: center;
    z-index: 1000;
}
.eliminated-overlay h2 {
    color: red;
    text-shadow: 0 0 10px red;
}
.joc {
    /* Estilos existentes del juego */
}
.paraula-actual h1 {
    font-size: 3rem;
}
.lletra-correcta {
    color: #4caf50;
}
.lletra-incorrecta {
    color: #f44336;
}
@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}
</style>
