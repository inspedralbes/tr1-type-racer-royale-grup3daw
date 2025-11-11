<script setup>
/**
 * Fichero: paginaFinal.vue
 * Descripción: Este componente muestra la pantalla de resultados al finalizar una partida.
 *
 * Funcionalidades:
 * - Recibe una lista de resultados (jugadores y sus puntuaciones) a través de las `props`.
 * - Ordena a los jugadores de mayor a menor puntuación para crear un ranking.
 * - Muestra el ranking en una lista ordenada.
 * - Ofrece un botón para "Volver a jugar", que emite un evento `reiniciar` al componente padre
 *   (`GameEngine.vue`) para volver al lobby.
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/game';
import { useSessionStore } from '../stores/session';
import { communicationManager } from '../communicationManager';

const router = useRouter();
const gameStore = useGameStore();
const sessionStore = useSessionStore();

onMounted(async () => {
  await communicationManager.updatePlayerPage('final');

  // Guardar las estadísticas del jugador si no es un invitado
  const currentPlayerName = sessionStore.playerName;
  const playerResult = gameStore.finalResults.find(r => r.nombre === currentPlayerName);

  // Solo guardar si el jugador se encuentra en los resultados y es un usuario registrado (tiene email)
  if (playerResult && sessionStore.email) {
    try {
      await communicationManager.sendGameStats({
        playerName: playerResult.nombre,
        score: playerResult.puntuacion,
        wpm: playerResult.wpm,
      });
      console.log('Estadísticas del juego guardadas para', playerResult.nombre);
    } catch (error) {
      console.error('Error al guardar las estadísticas del juego:', error);
    }
  }
});

// `ranking` es una propiedad computada que ordena los resultados recibidos.
// Se recalculará automáticamente si la prop `resultados` cambia.
const ranking = computed(() => {
  return [...gameStore.finalResults].sort((a, b) => b.puntuacion - a.puntuacion)
})

function volverAJugar() {
  gameStore.setFinalResults([]);
  sessionStore.setEtapa('lobby');
}
</script>

<template>
  <div class ="final-background">
    <div class ="pantalla-final">
    <!--
      Muestra el título y una lista ordenada (`ol`) con el ranking de jugadores.
      El `v-for` itera sobre la propiedad computada `ranking`.
    -->
    <h1>Ranking Final</h1>
    
    <ol>
      <li
        class ="ranking" 
        v-for="(jugador, index) in ranking" 
        :key="jugador.nombre"
      >
        <span>
          <span v-if="index === 0"></span>
          <span v-else-if="index === 1"></span>
          <span v-else-if="index === 2"></span>
          <span v-else>#{{ index + 1 }}</span>
        </span>
        
        <span>{{ jugador.nombre }}&nbsp;</span>
        <span >{{ jugador.puntuacion }} Puntos</span>
        <span v-if="jugador.wpm"> ({{ jugador.wpm.toFixed(2) }} WPM)</span>
      </li>
    </ol>

    <button class="final-button" @click="volverAJugar">Tornar a jugar</button>
  </div>
  </div>

</template>

<style src="../styles/stylePantallaFinal.css">
</style>