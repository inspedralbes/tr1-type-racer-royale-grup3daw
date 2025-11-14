<template>
  <div class="stats-background">
    <div class="centra-console-panel">
      <div class="stats-container hologram hologram-entrance">
        <button class="back-button" @click="goBack">Tornar</button>
        <h2>Estadístiques de Jugadors</h2>
        
        <div v-if="loading">Carregant estadístiques...</div>
        <div v-else-if="error" class="error-message">Error en carregar les estadístiques: {{ error }}</div>
        
        <div v-else class="stats-content">
          <div class="game-mode-tabs">
            <button @click="selectedGameMode = 'cuentaAtrasSimple'" :class="{ active: selectedGameMode === 'cuentaAtrasSimple' }">Compte Enrere</button>
            <button @click="selectedGameMode = 'powerUps'" :class="{ active: selectedGameMode === 'powerUps' }">Potenciadors</button>
            <button @click="selectedGameMode = 'MuerteSubita'" :class="{ active: selectedGameMode === 'MuerteSubita' }">Mort Súbita</button>
          </div>

          <div class="stats-display">
            <!-- Cuenta Atrás Simple -->
            <div v-if="selectedGameMode === 'cuentaAtrasSimple'">
              <h3>Top Jugadors - Compte Enrere</h3>
              <ul class="stats-list">
                <li v-for="stat in statsCuentaAtras" :key="stat._id">
                  <h4>{{ stat._id }}</h4>
                  <p>Partides Jugades: {{ stat.totalGames }}</p>
                  <p>Puntuació Mitjana: {{ stat.avgScore ? stat.avgScore.toFixed(2) : 0 }}</p>
                  <p>WPM Mitjà: {{ stat.avgWpm ? stat.avgWpm.toFixed(2) : 0 }}</p>
                </li>
              </ul>
              <p v-if="!statsCuentaAtras.length">No hi ha estadístiques disponibles per a aquest mode de joc.</p>
            </div>

            <!-- Power-Ups -->
            <div v-if="selectedGameMode === 'powerUps'">
              <h3>Top Jugadors - Potenciadors</h3>
              <ul class="stats-list">
                <li v-for="stat in statsPowerUps" :key="stat._id">
                  <h4>{{ stat._id }}</h4>
                  <p>Partides Jugades: {{ stat.totalGames }}</p>
                  <p>Puntuació Mitjana: {{ stat.avgScore ? stat.avgScore.toFixed(2) : 0 }}</p>
                  <p>WPM Mitjà: {{ stat.avgWpm ? stat.avgWpm.toFixed(2) : 0 }}</p>
                </li>
              </ul>
               <p v-if="!statsPowerUps.length">No hi ha estadístiques disponibles per a aquest mode de joc.</p>
            </div>

            <!-- Muerte Súbita -->
            <div v-if="selectedGameMode === 'MuerteSubita'">
              <h3>Top Jugadors - Mort Súbita</h3>
              <ul class="stats-list">
                <li v-for="stat in statsMuerteSubita" :key="stat._id">
                  <h4>{{ stat._id }}</h4>
                  <p>Partides Jugades: {{ stat.totalGames }}</p>
                  <p>Supervivència Mitjana: {{ stat.avgSurvivalTime ? stat.avgSurvivalTime.toFixed(2) : 0 }}s</p>
                  <p>WPM Mitjà: {{ stat.avgWpm ? stat.avgWpm.toFixed(2) : 0 }}</p>
                </li>
              </ul>
               <p v-if="!statsMuerteSubita.length">No hi ha estadístiques disponibles per a aquest mode de joc.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { communicationManager } from '../communicationManager';

const router = useRouter();
const loading = ref(true);
const error = ref(null);

const selectedGameMode = ref('cuentaAtrasSimple');
const statsCuentaAtras = ref([]);
const statsPowerUps = ref([]);
const statsMuerteSubita = ref([]);

const goBack = () => {
  router.back();
};

onMounted(async () => {
  try {
    // Fetch stats for all game modes
    const [cuentaAtrasRes, powerUpsRes, muerteSubitaRes] = await Promise.all([
      communicationManager.getPlayerStats('cuentaAtrasSimple'),
      communicationManager.getPlayerStats('powerUps'),
      communicationManager.getPlayerStats('MuerteSubita'),
    ]);

    statsCuentaAtras.value = cuentaAtrasRes.data;
    statsPowerUps.value = powerUpsRes.data;
    statsMuerteSubita.value = muerteSubitaRes.data;

  } catch (err) {
    error.value = err.message;
    console.error('Error en obtenir les estadístiques dels jugadors:', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
@import '../styles/styleStats.css';




.stats-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.game-mode-tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.game-mode-tabs button {
  padding: 10px 20px;
  background-color: #2a3a5b;
  color: #ffffff;
  border: 1px solid #4f6a9e;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s, box-shadow 0.3s;
}

.game-mode-tabs button:hover {
  background-color: #3a4a6b;
  box-shadow: 0 0 10px #61dafb;
}

.game-mode-tabs button.active {
  background-color: #61dafb;
  color: #1a2238;
  font-weight: bold;
  box-shadow: 0 0 15px #61dafb;
}

.stats-display h3 {
  color: #61dafb;
  text-align: center;
  margin-bottom: 15px;
}
.stats-list {
  list-style: none;
  padding: 0;
  gap: 20px;
  display: flex;
  flex-direction: row;   
  flex-wrap: wrap;        
  justify-content: center;  
  max-height: none;
  overflow-y: visible;
  padding-right: 0;
}

.stats-list li {
  background-color: rgba(13, 32, 78, 0.8);
  padding: 15px 20px; 
  border-radius: 8px;
  border: 1px solid #4f6a9e;
  width: 280px; 
  box-sizing: border-box; 
}

.stats-list h4 {
  margin: 0 0 10px 0;
  color: #ffc107;
  text-align: center;
  border-bottom: 1px solid #4f6a9e; 
  padding-bottom: 5px;
}

.stats-list p {
  margin: 5px 0;
  color: #e0e0e0;
  font-size: 0.9em;
}

.error-message {
  color: #ff4141;
  text-align: center;
}

.stats-list::-webkit-scrollbar {
  width: 8px;
}

.stats-list::-webkit-scrollbar-track {
  background: rgba(13, 32, 78, 0.5); 
  border-radius: 4px;
}

.stats-list::-webkit-scrollbar-thumb {
  background: #61dafb; 
  border-radius: 4px;
  border: 1px solid #2a3a5b;
}

.stats-list::-webkit-scrollbar-thumb:hover {
  background: #ffffff;
}

</style>