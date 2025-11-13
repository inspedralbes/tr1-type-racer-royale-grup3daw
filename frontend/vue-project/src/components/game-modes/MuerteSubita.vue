<template>
  <div class="main-background">
    <div class="game-container">
      <h2>Muerte Súbita, {{ playerName }}!</h2>

      <div v-if="!gameEnded">
        <div class="puntuacions">
          <h2>Supervivientes</h2>
          <TransitionGroup tag="ul" id="llista-jugadors" name="list-ranking">
            <li v-for="jugador in jugadoresSupervivientes" :key="jugador.socketId" :class="{ 'player-eliminated': jugador.gameData.isEliminated }">
              <span>{{ jugador.name }}</span>
              <strong v-if="!jugador.gameData.isEliminated">{{ jugador.gameData.time }}s</strong>
              <strong v-else>ELIMINADO</strong>
            </li>
          </TransitionGroup>
        </div>

        <main class="joc" v-if="estatDelJoc.paraules.length > 0 && !isPlayerEliminated">
          <div class="game-content-wrapper">
            <div class="paraula-actual">
              <h1 ref="meteorWordEl" class="fall-animation">
                <span v-for="(lletra, index) in paraulaActiva.text" :key="index" :class="obtenirClasseLletra(lletra, index)">
                  {{ lletra }}
                </span>
              </h1>
              <input type="text" v-model="estatDelJoc.textEntrat" @input="validarProgres" autofocus :disabled="isPlayerEliminated" />
              <img v-if="playerShipSrc" :src="playerShipSrc" alt="Nave seleccionada" class="player-ship" />
            </div>
          </div>
        </main>

        <!-- Pantalla superpuesta de eliminación -->
        <div v-if="isPlayerEliminated" class="elimination-overlay">
          <div class="elimination-box">
            <h2>Has sido eliminado</h2>
            <p>Ahora eres un espectador.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { communicationManager, socket } from '../../communicationManager';
import { useGameStore } from '../../stores/game';
import { useRoomStore } from '../../stores/room';
import { useSessionStore } from '../../stores/session';
import { useNotificationStore } from '../../stores/notification';

const props = defineProps({
  words: { type: Object, default: null },
  wordsLoaded: { type: Boolean, default: false },
  playerName: { type: String, default: '' },
  roomState: { type: Object, default: () => ({}) },
});

const gameStore = useGameStore();
const roomStore = useRoomStore();
const sessionStore = useSessionStore();
const notificationStore = useNotificationStore();

const { nombreJugador } = storeToRefs(gameStore);
const playerName = computed(() => props.playerName || nombreJugador.value || '');

const estatDelJoc = ref({
  paraules: [],
  indexParaulaActiva: 0,
  textEntrat: '',
  stats: [],
  errorTotal: 0,
});

let startTime = 0;
let survivalTime = 0;
const statsSent = ref(false);

const gameEnded = ref(false);
const jugadoresSupervivientes = ref([]);
const meteorWordEl = ref(null);

const isPlayerEliminated = computed(() => {
  const self = jugadoresSupervivientes.value.find(p => p.name === playerName.value);
  return self ? self.gameData.isEliminated : false;
});

const paraulaActiva = computed(() => {
  return estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva];
});

const playerShipSrc = computed(() => {
  try {
    const player = roomStore.jugadores.find(j => j.name === playerName.value) || {};
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

const sendGameStats = async () => {
  if (statsSent.value) return;
  statsSent.value = true;

  if (startTime === 0) survivalTime = 0;
  else survivalTime = (Date.now() - startTime) / 1000;

  const totalTypedChars = estatDelJoc.value.stats.reduce((acc, word) => acc + word.paraula.length, 0);
  const gameDurationInMinutes = survivalTime / 60;
  const wpm = gameDurationInMinutes > 0 ? (totalTypedChars / 5) / gameDurationInMinutes : 0;

  const gameStats = {
    playerName: playerName.value,
    words: estatDelJoc.value.stats,
    score: estatDelJoc.value.stats.length, 
    gameMode: 'MuerteSubita',
    errors: estatDelJoc.value.errorTotal,
    wpm: wpm,
    survivalTime: survivalTime,
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
};

const handleStateUpdate = (data) => {
  jugadoresSupervivientes.value = data.players.sort((a, b) => {
    if (a.gameData.isEliminated && !b.gameData.isEliminated) return 1;
    if (!a.gameData.isEliminated && b.gameData.isEliminated) return -1;
    return b.gameData.time - a.gameData.time;
  });
};

const handlePlayerEliminated = ({ playerId }) => {
  const player = roomStore.jugadores.find(p => p.socketId === playerId);
  if (player) {
    notificationStore.pushNotification({
      type: 'info',
      message: `${player.name} ha sido eliminado!`,
    });
  }
};

const handleGameOver = ({ results }) => {
  gameEnded.value = true;
  
  const winner = results.find(p => p.nombre === playerName.value);
  if (winner && !isPlayerEliminated.value) {
    sendGameStats();
  }

  gameStore.setFinalResults(results);
  sessionStore.setEtapa('done');
};

onMounted(async () => {
  await communicationManager.updatePlayerPage('MuerteSubita');
  socket.on('muerte-subita-state-update', handleStateUpdate);
  socket.on('player-eliminated', handlePlayerEliminated);
  socket.on('game-over', handleGameOver);
  startTime = Date.now();
});

onUnmounted(() => {
  socket.off('muerte-subita-state-update', handleStateUpdate);
  socket.off('player-eliminated', handlePlayerEliminated);
  socket.off('game-over', handleGameOver);
});

watch([() => props.words, () => props.roomState?.isPlaying], ([newWords, newIsPlaying]) => {
  if (props.wordsLoaded && newWords && newIsPlaying && !gameEnded.value) {
    initializeWords(props.words);
  }
}, { immediate: true, deep: true });

watch(isPlayerEliminated, (newValue) => {
  if (newValue) {
    sendGameStats();
  }
});

watch(() => estatDelJoc.value.indexParaulaActiva, async () => {
  await nextTick();
  if (meteorWordEl.value) {
    meteorWordEl.value.classList.remove('fall-animation');
    void meteorWordEl.value.offsetWidth;
    meteorWordEl.value.classList.add('fall-animation');
  }
});

function initializeWords(wordsData) {
  if (!wordsData) return;
  let allWords = [
    ...(wordsData.facil || []).map(word => ({ text: word, difficulty: 'facil' })),
    ...(wordsData.normal || []).map(word => ({ text: word, difficulty: 'normal' })),
    ...(wordsData.dificil || []).map(word => ({ text: word, difficulty: 'dificil' })),
  ];
  for (let i = allWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
  }
  estatDelJoc.value.paraules = allWords.map(p => ({ ...p, errors: 0, estat: 'pendent' }));
  estatDelJoc.value.indexParaulaActiva = 0;
  estatDelJoc.value.textEntrat = '';
}

function obtenirClasseLletra(lletra, index) {
  const entrada = estatDelJoc.value.textEntrat[index];
  if (!entrada) return '';
  return lletra === entrada ? 'lletra-correcta' : 'lletra-incorrecta';
}

async function validarProgres() {
  const entrada = estatDelJoc.value.textEntrat.toLowerCase();
  estatDelJoc.value.textEntrat = entrada;

  const paraula = paraulaActiva.value;
  if (!paraula) return;

  paraula.errors = 0;
  paraula._errors = paraula._errors || [];
  for (let i = 0; i < entrada.length; i++) {
    if (entrada[i] !== paraula.text[i] && !paraula._errors[i]) {
      paraula.errors++;
      estatDelJoc.value.errorTotal++;
      paraula._errors[i] = true;
    }
  }

  if (entrada === paraula.text) {
    socket.emit('muerte-subita-word-correct', {
      roomId: roomStore.roomId,
      difficulty: paraula.difficulty,
    });

    estatDelJoc.value.stats.push({
      paraula: paraula.text,
      errors: paraula.errors,
    });

    estatDelJoc.value.indexParaulaActiva++;
    estatDelJoc.value.textEntrat = '';

    if (estatDelJoc.value.indexParaulaActiva >= estatDelJoc.value.paraules.length) {
      initializeWords(props.words);
    }
  }
}
</script>

<style scoped>
@import '../../styles/stylesCuentaAtrasSimple.css';

.player-eliminated {
  opacity: 0.5;
  text-decoration: line-through;
}

.eliminated-message {
  text-align: center;
  margin-top: 50px;
  color: #ff4141;
}

.elimination-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.elimination-box {
  background-color: #1a2238;
  padding: 40px;
  border-radius: 10px;
  text-align: center;
  border: 2px solid #ff4141;
  box-shadow: 0 0 15px #ff4141;
}

</style>