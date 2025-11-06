<template>
  <div class="main-background">
    <div class="game-container">
      <component
        :is="currentGameModeComponent"
        :words="words"
        :wordsLoaded="wordsLoaded"
        :playerName="nombreJugador"
        :jugadores="jugadores"
        :roomState="roomState"
        :gameMode="props.gameMode"
        :roomId="props.roomId"
        @done="onGameOver"
      />
    </div>
  </div>
</template>

<script setup>
import { defineAsyncComponent, computed } from 'vue';
import { useGameStore } from '../stores/game';
import { useRoomStore } from '../stores/room';
import { storeToRefs } from 'pinia';

const props = defineProps({
  gameMode: { type: String, required: true },
  roomId: { type: String, required: true }, // route passes this
});

const emits = defineEmits(['done']);

// Use Pinia stores to get shared state instead of relying on parent to pass everything
const gameStore = useGameStore();
const roomStore = useRoomStore();
const { nombreJugador, words, wordsLoaded } = storeToRefs(gameStore);
const { jugadores, roomState } = storeToRefs(roomStore);

const currentGameModeComponent = computed(() => {
  switch (props.gameMode) {
    case 'cuentaAtrasSimple':
      return defineAsyncComponent(() => import('./game-modes/CuentaAtrasSimple.vue'));
    case 'modoJuego2':
      return defineAsyncComponent(() => import('./game-modes/ModoJuego2.vue'));
    case 'modoJuego3':
      return defineAsyncComponent(() => import('./game-modes/ModoJuego3.vue'));
    default:
      // Fallback to CuentaAtrasSimple or a default error component
      console.warn(`Unknown game mode: ${props.gameMode}. Falling back to CuentaAtrasSimple.`);
      return defineAsyncComponent(() => import('./game-modes/CuentaAtrasSimple.vue'));
  }
});

const onGameOver = (results) => {
  emits('done', results);
};
</script>

<style src="../styles/stylesJoc.css"></style>