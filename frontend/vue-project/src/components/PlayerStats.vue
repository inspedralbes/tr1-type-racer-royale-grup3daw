<template>
  <div class="player-stats-container">
    <button class="back-button" @click="goBack">←</button>
    <h2>Estadísticas de Jugadores</h2>
    <div v-if="loading">Cargando estadísticas...</div>
    <div v-else-if="error">Error al cargar estadísticas: {{ error }}</div>
    <div v-else>
      <ul class="stats-list">
        <li v-for="stat in playerStats" :key="stat._id">
          <h3>{{ stat._id }}</h3>
          <p>Partidas Jugadas: {{ stat.totalGames }}</p>
          <p>Puntuación Media: {{ stat.avgScore.toFixed(2) }}</p>
          <p>WPM Media: {{ stat.avgWpm.toFixed(2) }}</p>
          <p>Mejor Puntuación: {{ stat.maxScore }}</p>
          <p>Mejor WPM: {{ stat.maxWpm }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useGameStore } from '../stores/game';
import { communicationManager } from '../communicationManager';

const gameStore = useGameStore();
const playerStats = ref([]);
const loading = ref(true);
const error = ref(null);

const goBack = () => {
  gameStore.setEtapa('room-selection'); // Or 'lobby', depending on desired navigation
};

onMounted(async () => {
  try {
    const response = await communicationManager.getPlayerStats();
    playerStats.value = response.data;
  } catch (err) {
    error.value = err.message;
    console.error('Error fetching player stats:', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.player-stats-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #282c34;
  color: #ffffff;
  min-height: 100vh;
}

.back-button {
  align-self: flex-start;
  margin-bottom: 20px;
  padding: 10px 15px;
  background-color: #61dafb;
  color: #282c34;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

h2 {
  color: #61dafb;
  margin-bottom: 30px;
}

.stats-list {
  list-style: none;
  padding: 0;
  width: 100%;
  max-width: 600px;
}

.stats-list li {
  background-color: #3a3f47;
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.stats-list h3 {
  color: #a0e9fd;
  margin-top: 0;
  margin-bottom: 10px;
}

.stats-list p {
  margin: 5px 0;
  font-size: 1.1em;
}
</style>