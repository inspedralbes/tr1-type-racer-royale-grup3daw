<script setup>
import { ref, watch } from 'vue'  

const props = defineProps({
  playerName: String
})

const emit = defineEmits(['startGame'])  

const jugadores = ref([])

watch(
  () => props.playerName,
  (nuevoNombre) => {
    if (nuevoNombre && !jugadores.value.includes(nuevoNombre)) {
      jugadores.value.push(nuevoNombre)
    }
  },
  { immediate: true } 
)

function agregarJugador(nombre) {
  if (nombre && !jugadores.value.includes(nombre)) {
    jugadores.value.push(nombre)
  }
}

function iniciarJuego() {
  emit('startGame')
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

    <button @click="iniciarJuego">Començar Joc</button>
  </div>
</template>

<style src="../styles/style.css"></style>
