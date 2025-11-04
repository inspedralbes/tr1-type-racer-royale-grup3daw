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
import { computed } from 'vue'

// Define las propiedades que el componente espera recibir del padre.
const props = defineProps({
  resultados: {
    type: Array,
    required: true
  }
})

// Define los eventos que el componente puede emitir hacia el padre.
const emit = defineEmits(['reiniciar'])

// `ranking` es una propiedad computada que ordena los resultados recibidos.
// Se recalculará automáticamente si la prop `resultados` cambia.
const ranking = computed(() => {
  return [...props.resultados].sort((a, b) => b.puntuacion - a.puntuacion)
})

function volverAJugar() {
  // Emite el evento 'reiniciar' para que el componente padre (GameEngine) pueda manejarlo.
  emit('reiniciar')
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
      </li>
    </ol>

    <button class="final-button" @click="volverAJugar">Tornar a jugar</button>
  </div>
  </div>

</template>

<style src="../styles/stylePantallaFinal.css">
</style>