<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  playerName: String
})
</script>

<template>
  <div class="lobby">
    <h2>Benvingut, {{ playerName }}!</h2>
    <p>Esto es el Lobby del juego</p>
  </div>
</template>
