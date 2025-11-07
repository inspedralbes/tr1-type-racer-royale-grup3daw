<template>
  <div class="player-stats-container">
    <button class="back-button" @click="goBack">←</button>
    <h2>Estadísticas de Jugadores</h2>
    <div v-if="loading">Cargando estadísticas...</div>
    <div v-else-if="error">Error al cargar estadísticas: {{ error }}</div>
    <div v-else>
      <div class="chart-container">
        <h3>Ranking por Puntuación Media</h3>
        <div id="chart"></div>
      </div>
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
import { communicationManager } from '../communicationManager';
import * as d3 from 'd3';

const gameStore = useGameStore();
const playerStats = ref([]);
const loading = ref(true);
const error = ref(null);

const goBack = () => {
  gameStore.setEtapa('room-selection'); // Or 'lobby', depending on desired navigation
};

const drawChart = () => {
  // Clear any existing chart to prevent duplicates on re-renders
  d3.select("#chart").selectAll("*").remove();

  const data = playerStats.value;

  const margin = { top: 40, right: 30, bottom: 70, left: 60 };
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#chart").append("svg")
    .attr("width", "100%")
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X scale
  const x = d3.scaleBand()
    .range([0, width])
    .padding(0.1);

  // Y scale
  const y = d3.scaleLinear()
    .range([height, 0]);

  x.domain(data.map(d => d._id));
  y.domain([0, d3.max(data, d => d.avgScore) * 1.1]); // Add some padding to the top

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end")
    .style("fill", "#ffffff"); // White color for axis text

  // Y axis
  svg.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "#ffffff"); // White color for axis text

  // Y axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("fill", "#ffffff")
    .text("Puntuación Media");

  // Bars
  svg.selectAll(".bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d._id))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.avgScore))
    .attr("height", d => height - y(d.avgScore))
    .attr("fill", "#61dafb") // Bar color
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "#a0e9fd"); // Hover color
      tooltip.style("opacity", 1)
        .html(`Jugador: ${d._id}<br/>Puntuación Media: ${d.avgScore.toFixed(2)}<br/>Partidas Jugadas: ${d.totalGames}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("fill", "#61dafb"); // Restore original color
      tooltip.style("opacity", 0);
    });

  // Tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "#3a3f47")
    .style("color", "#ffffff")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("pointer-events", "none"); // Important for tooltip not to block mouse events
};

onMounted(async () => {
  try {
    const response = await communicationManager.getPlayerStats();
    playerStats.value = response.data;
    drawChart();
  } catch (err) {
    error.value = err.message;
    console.error('Error fetching player stats:', err);
  } finally {
    loading.value = false;
  }
});

// Clean up tooltip on component unmount
onUnmounted(() => {
  d3.select(".tooltip").remove();
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

.chart-container {
  width: 90%;
  max-width: 960px;
  background-color: #3a3f47;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  margin-bottom: 30px;
  text-align: center;
}

.chart-container h3 {
  color: #a0e9fd;
  margin-bottom: 20px;
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

/* D3 Chart specific styles */
.bar {
  transition: fill 0.3s ease;
}

.axis path,
.axis line {
  stroke: #ffffff;
}

.axis text {
  fill: #ffffff;
  font-size: 12px;
}

.tooltip {
  background-color: #3a3f47;
  color: #ffffff;
  padding: 10px;
  border-radius: 5px;
  pointer-events: none;
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
}
</style>