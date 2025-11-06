<template>
  <div class="game-mode">
    <h2>Modo Juego 3</h2>
    <p>Este modo de juego está en desarrollo</p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useNotificationStore } from '../../stores/notification'

const props = defineProps({
  playerName: {
    type: String,
    default: ''
  },
  roomState: {
    type: Object,
    default: () => ({})
  },
  words: {
    type: Object,
    default: () => ({})
  },
  wordsLoaded: {
    type: Boolean,
    default: false
  },
  jugadores: {
    type: Array,
    default: () => []
  }
})

const notificationStore = useNotificationStore()

onMounted(() => {
  notificationStore.pushNotification({
    type: 'info',
    message: 'Modo Juego 3 está en desarrollo'
  })
})
</script>

<style scoped>
.game-mode {
  padding: 20px;
  text-align: center;
}
</style>
