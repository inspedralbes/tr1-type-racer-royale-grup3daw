<script setup>
import { computed } from 'vue'

const props = defineProps({
  resultados: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['reiniciar'])

const ranking = computed(() => {
  return [...props.resultados].sort((a, b) => b.puntuacion - a.puntuacion)
})

function volverAJugar() {
  emit('reiniciar')
}
</script>

<template>
  <div class ="final-background">
    <div>
    <h1>Ranking Final</h1>
    
    <ol>
      <li 
        v-for="(jugador, index) in ranking" 
        :key="jugador.nombre"
      >
        <span>
          <span v-if="index === 0">1 -</span>
          <span v-else-if="index === 1">2 -</span>
          <span v-else-if="index === 2">3 -</span>
          <span v-else>#{{ index + 1 }}</span>
        </span>
        
        <span>{{ jugador.nombre }}</span>
        <span >{{ jugador.puntuacion }} Puntos</span>
      </li>
    </ol>

    <button @click="volverAJugar">Tornar a jugar</button>
  </div>
  </div>

</template>

<style src="../styles/stylePantallaFinal.css">
</style>