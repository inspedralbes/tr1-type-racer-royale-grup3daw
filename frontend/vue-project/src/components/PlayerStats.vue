<template>
  <div class="player-stats-container">
    <button class="back-button" @click="goBack">←</button>
    <h2>Estadísticas de Jugadores</h2>
    <div v-if="loading">Cargando estadísticas...</div>
    <div v-else-if="error">Error al cargar estadísticas: {{ error }}</div>
    <div v-else>
      <!-- Gráfico de Ranking General -->
      <div class="chart-container">
        <h3>Ranking por Puntuación Media</h3>
        <div id="chart"></div>
      </div>

      <!-- Gráfico de Evolución Personal (Bollinger Bands) -->
      <div class="chart-container">
        <h3>Evolución de WPM de {{ sessionStore.playerName }}</h3>
        <div id="bollinger-chart"></div>
        <p v-if="scoreHistory.length < 2">No hay suficientes datos para mostrar la evolución.</p>
      </div>

      <!-- Lista de Estadísticas (opcional, se puede mantener o quitar) -->
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
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';
import { useSessionStore } from '../stores/session';
import { communicationManager } from '../communicationManager';
import * as d3 from 'd3';

const gameStore = useGameStore();
const sessionStore = useSessionStore();
const playerStats = ref([]);
const scoreHistory = ref([]);
const loading = ref(true);
const error = ref(null);

const goBack = () => {
  gameStore.setEtapa('room-selection');
};

const drawChart = () => {
  d3.select("#chart").selectAll("*").remove();
  if (playerStats.value.length === 0) return;

  // Simplified chart for debugging
  const svg = d3.select("#chart").append("svg")
    .attr("width", 500)
    .attr("height", 100)
    .style("background-color", "lightgray");

  svg.append("rect")
    .attr("x", 10)
    .attr("y", 10)
    .attr("width", 80)
    .attr("height", 80)
    .attr("fill", "red");
    
  svg.append("text")
    .attr("x", 100)
    .attr("y", 50)
    .text("Test Chart - If you see this, SVG is working.")
    .attr("fill", "black");
};

const drawBollingerBandsChart = (data) => {
  d3.select("#bollinger-chart").selectAll("*").remove();
  if (data.length < 2) return;

  const margin = { top: 40, right: 30, bottom: 70, left: 60 };
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#bollinger-chart").append("svg")
    .attr("width", "100%")
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const parsedData = data.map(d => ({
    date: new Date(d.createdAt),
    wpm: +d.wpm
  }));

  const n = 20; // Period for moving average and stdev
  const k = 2; // Standard deviation multiplier

  const bollingerData = [];
  for (let i = 0; i < parsedData.length; i++) {
    const slice = parsedData.slice(Math.max(0, i - n + 1), i + 1);
    const mean = d3.mean(slice, d => d.wpm);
    const stdDev = d3.deviation(slice, d => d.wpm);
    bollingerData.push({
      date: parsedData[i].date,
      wpm: parsedData[i].wpm,
      mean: mean,
      upper: mean + k * stdDev,
      lower: mean - k * stdDev
    });
  }

  const x = d3.scaleTime().range([0, width]).domain(d3.extent(bollingerData, d => d.date));
  const y = d3.scaleLinear().range([height, 0]).domain([0, d3.max(bollingerData, d => Math.max(d.wpm, d.upper)) * 1.1 || 100]);

  svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5))
    .selectAll("text").style("fill", "#ffffff");

  svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("fill", "#ffffff");
  
  svg.append("text").attr("transform", "rotate(-90)").attr("y", 0 - margin.left).attr("x", 0 - (height / 2))
    .attr("dy", "1em").style("text-anchor", "middle").style("fill", "#ffffff").text("WPM");

  const line = (yValue) => d3.line().x(d => x(d.date)).y(d => y(d[yValue]));

  svg.append("path").datum(bollingerData).attr("class", "line wpm-line").attr("d", line('wpm'));
  svg.append("path").datum(bollingerData.slice(n - 1)).attr("class", "line mean-line").attr("d", line('mean'));
  svg.append("path").datum(bollingerData.slice(n - 1)).attr("class", "line upper-band").attr("d", line('upper'));
  svg.append("path").datum(bollingerData.slice(n - 1)).attr("class", "line lower-band").attr("d", line('lower'));
};


onMounted(async () => {
  // Create tooltip element once
  d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

  try {
    // Fetch general stats
    const statsResponse = await communicationManager.getPlayerStats();
    playerStats.value = statsResponse.data;
    drawChart();

    // Fetch personal score history
    const playerName = sessionStore.playerName;
    if (playerName) {
      const historyResponse = await communicationManager.getPlayerScoreHistory(playerName);
      scoreHistory.value = historyResponse.data;
      drawBollingerBandsChart(scoreHistory.value);
    }
  } catch (err) {
    error.value = err.message;
    console.error('Error fetching stats:', err);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  d3.select(".tooltip").remove();
});
</script>

<!-- Global styles for D3 elements appended to the body or for general line styles -->
<style>
.tooltip {
  position: absolute;
  background-color: #3a3f47;
  color: #ffffff;
  padding: 10px;
  border-radius: 5px;
  pointer-events: none;
  opacity: 0;
}
.line {
  fill: none;
  stroke-width: 2px;
}
.wpm-line {
  stroke: #61dafb; /* Azul */
}
.mean-line {
  stroke: #ffab00; /* Naranja */
  stroke-dasharray: 5,5;
}
.upper-band, .lower-band {
  stroke: #e91e63; /* Rosa */
  stroke-dasharray: 2,2;
}
</style>

<style scoped>
.player-stats-container {
  padding: 20px;
  color: #ffffff;
}
.chart-container {
  margin-bottom: 40px;
  background-color: #2c2f36;
  padding: 20px;
  border-radius: 8px;
}
.stats-list {
  list-style: none;
  padding: 0;
}
.stats-list li {
  background-color: #3a3f47;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 5px;
}
</style>