<script setup>
  import { onMounted } from 'vue';
  import GameEngine from './components/GameEngine.vue';
  import { setupSocketListeners } from './communicationManager';

  onMounted(() => {
    setupSocketListeners();
  });
</script>

<template>
  <GameEngine />
</template>

<style scoped>

  /*hacer tamaños con REM */

</style>