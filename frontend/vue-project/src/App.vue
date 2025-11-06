<template>
  <NotificationCenter />
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { communicationManager, setupSocketListeners } from './communicationManager';
import { useSessionStore } from './stores/session';
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
  const token = sessionStore.token;
  const roomIdFromSession = sessionStore.roomId;
  const playerNameFromSession = sessionStore.playerName;

  if (token && playerNameFromSession) {
    console.log('App.vue onMounted - Existing token and playerName found. Attempting to reconnect...');
    try {
      communicationManager.connect();
      gameStore.setNombreJugador(playerNameFromSession);

      if (roomIdFromSession) {
        roomStore.setRoomId(roomIdFromSession);
        sessionStore.setRoomId(roomIdFromSession);
        await communicationManager.waitUntilConnected(); // Ensure socket is connected
        communicationManager.joinRoom(roomIdFromSession);

        const roomDetails = await communicationManager.getRoomDetails(roomIdFromSession);
        roomStore.setRoom(roomDetails.data);

        if (roomDetails.data.isPlaying) {
          sessionStore.setEtapa('game');
        } else {
          sessionStore.setEtapa('lobby');
        }
                } else {
                  sessionStore.setEtapa('room-selection');
                }    } catch (error) {
  console.error('Error al reconectar la sesión:', error);
  notificationStore.pushNotification({ type: 'error', message: 'Error al reconectar la sesión: ' + (error.message || '') });
      sessionStore.clearSession();
      gameStore.resetState();
      roomStore.resetState();
      publicRoomsStore.resetState();
      router.push('/login'); // Redirect to login on reconnection failure
    }
  } else {
    console.log('App.vue onMounted - No valid token or playerName found. Resetting state and redirecting to login.');
    sessionStore.clearSession();
    gameStore.resetState();
    roomStore.resetState();
    publicRoomsStore.resetState();
    router.push('/login');
  }
});
</script>

<style scoped>
/*hacer tamaños con REM */
</style>