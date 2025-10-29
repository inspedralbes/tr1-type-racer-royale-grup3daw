<script setup>
import { ref } from 'vue'

const props = defineProps({
  playerName: String
})

const jugadores = ref([])

if (props.playerName && !jugadores.value.includes(props.playerName)) {
  jugadores.value.push(props.playerName)
}

function agregarJugador(nombre) {
  if (nombre && !jugadores.value.includes(nombre)) {
    jugadores.value.push(nombre)
  }
}
</script>

<template>
  <div class="lobby-contenedor">
    <h1>Lobby 1</h1>
    <h2>Benvingut, {{ playerName }}!</h2>
    <ul class="lista-jugadores">
      <li v-for="(jugador, index) in jugadores" :key="index">
          {{ jugador }}
      </li>
    </ul>
    
  </div>
</template>
<style src="../styles/style.css"></style>
