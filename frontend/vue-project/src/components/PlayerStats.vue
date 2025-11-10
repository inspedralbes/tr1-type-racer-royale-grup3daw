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

      <!-- Gráfico de Evolución Personal -->
      <div class="chart-container">
        <h3>Evolución de WPM de {{ sessionStore.playerName }}</h3>
        <div id="wpm-chart"></div>
        <p v-if="scoreHistory.length < 2">No hay suficientes datos para mostrar la evolución.</p>
      </div>

      <!-- Lista de Estadísticas (opcional, se puede mantener o quitar) -->
      <ul class="stats-list">
        <li v-for="stat in playerStats" :key="stat._id">
          <h3>{{ stat._id }}</h3>
          <p>Partidas Jugadas: {{ stat.totalGames }}</p>
          <p>Puntuación Media: {{ stat.avgScore ? stat.avgScore.toFixed(2) : 0 }}</p>
          <p>WPM Media: {{ stat.avgWpm ? stat.avgWpm.toFixed(2) : 0 }}</p>
          <p>Mejor Puntuación: {{ stat.maxScore ?? 0 }}</p>
          <p>Mejor WPM: {{ stat.maxWpm ?? 0 }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/game';
import { useSessionStore } from '../stores/session';
import { communicationManager } from '../communicationManager';
import * as d3 from 'd3';

const router = useRouter();
const gameStore = useGameStore();
const sessionStore = useSessionStore();
const playerStats = ref([]);
const scoreHistory = ref([]);
const loading = ref(true);
const error = ref(null);

const goBack = () => {
  router.back();
};

const drawChart = () => {
  d3.select("#chart").selectAll("*").remove();
  if (playerStats.value.length === 0) return;

  const topPlayers = playerStats.value.slice(0, 5);

  const width = 500;
  const height = 300;
  const margin = { top: 20, right: 30, bottom: 40, left: 40 };

  const svg = d3.select("#chart").append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  const x = d3.scaleBand()
    .domain(topPlayers.map(d => d._id))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3.scaleLinear()
    .domain([0, d3.max(topPlayers, d => d.avgScore) || 100])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  const yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("g")
    .selectAll("rect")
    .data(topPlayers)
    .join("rect")
      .attr("x", d => x(d._id))
      .attr("y", d => y(d.avgScore))
      .attr("height", d => y(0) - y(d.avgScore))
      .attr("width", x.bandwidth())
      .attr("fill", "steelblue");

  svg.append("g")
      .call(xAxis)
      .selectAll("text")
      .style("fill", "#ffffff");

  svg.append("g")
      .call(yAxis)
      .selectAll("text")
      .style("fill", "#ffffff");
};

const drawWpmEvolutionChart = (data) => {
  console.log("--- Drawing WPM Evolution Chart ---");
  d3.select("#wpm-chart").selectAll("*").remove();
  
  if (!data || data.length < 2) {
    console.log("Not enough data to draw chart. Data:", data);
    return;
  }
  console.log("Step 1: Raw data has enough points.", data);


  const width = 928;
  const height = 500;
  const marginTop = 30;
  const marginRight = 50;
  const marginBottom = 50; // Increased for X-axis label
  const marginLeft = 60; // Increased for Y-axis label

  const parsedData = data.map((d, i) => ({
    game: i + 1,
    value: +d.wpm
  }));
  console.log("Step 2: Parsed data for chart:", parsedData);


  const x = d3.scaleLinear()
      .domain([1, parsedData.length])
      .range([marginLeft, width - marginRight]);

  const y = d3.scaleLinear()
      .domain([0, d3.max(parsedData, d => d.value) * 1.1 || 100])
      .range([height - marginBottom, marginTop]);
  
  console.log("Step 3: Scales created.");
  console.log("X-axis domain:", x.domain(), "range:", x.range());
  console.log("Y-axis domain:", y.domain(), "range:", y.range());


  const svg = d3.select("#wpm-chart").append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;");
  console.log("Step 4: SVG container created.");

  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).ticks(Math.min(parsedData.length, 10)).tickFormat(d3.format('d')))
      .selectAll("text").style("fill", "#ffffff");

  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text").style("fill", "#ffffff");

  // Add X-axis label
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .style("fill", "#ffffff")
    .text("Número de Partida");

  // Add Y-axis label
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", 20)
    .attr("x", -height / 2)
    .style("fill", "#ffffff")
    .text("WPM (Palabras por Minuto)");
  console.log("Step 5: Axes and labels drawn.");

  const line = d3.line()
      .x(d => x(d.game))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX); // Makes the line smoother

  const pathData = line(parsedData);
  console.log("Step 6: Line path data generated:", pathData);

  svg.append("path")
      .datum(parsedData)
      .attr("fill", "none")
      .attr("stroke", "#61dafb")
      .attr("stroke-width", 2)
      .attr("d", pathData);
  console.log("Step 7: Chart drawing complete.");
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
      console.log("Received score history from backend:", historyResponse.data);
      scoreHistory.value = historyResponse.data;
      drawWpmEvolutionChart(scoreHistory.value);
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