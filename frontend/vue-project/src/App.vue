<template>
  <NotificationCenter />
  <router-view v-slot="{ Component }">
    <transition name="hologram-slide" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { communicationManager } from './communicationManager.js';
import { useSessionStore } from './stores/session.js';
import { useGameStore } from './stores/game';
import { useRoomStore } from './stores/room';
import { usePublicRoomsStore } from './stores/publicRooms';
import NotificationCenter from './components/NotificationCenter.vue';
import { useNotificationStore } from './stores/notification';

const router = useRouter();
const sessionStore = useSessionStore();
const gameStore = useGameStore();
const roomStore = useRoomStore();
const publicRoomsStore = usePublicRoomsStore();
const notificationStore = useNotificationStore();

onMounted(async () => {
  // La responsabilidad principal de App.vue es configurar los listeners globales del socket.
  // La lógica de reconexión y gestión de sesión se ha centralizado en GameEngine.vue
  // para evitar conflictos y lógica duplicada.
});
</script>

<style scoped>
/*hacer tamaños con REM */
</style>