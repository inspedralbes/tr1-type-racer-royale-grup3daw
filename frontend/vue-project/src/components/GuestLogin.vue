
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { communicationManager } from '@/communicationManager'
import { useSessionStore } from '@/stores/session';
import { useGameStore } from '@/stores/game';
import { useNotificationStore } from '../stores/notification';

const nom = ref('')
const session = useSessionStore()
const gameStore = useGameStore()
const router = useRouter()

onMounted(async () => {
  // Ensure any previous session/socket is cleared when reaching guest login
  try {
    communicationManager.logout();
  } catch (e) {}
  try {
    communicationManager.disconnect();
  } catch (e) {}
  await communicationManager.updatePlayerPage('guest-login');
});

const loginAsGuest = async () => {
  if (nom.value.trim() === '') {
    const notificationStore = useNotificationStore();
    notificationStore.pushNotification({ type: 'error', message: 'Por favor, introduce un nombre para continuar.' });
    return
  }

  try {
    const response = await communicationManager.loginAsGuest(nom.value);
    const { token, username, email } = response.data;
    session.setSession(token, username, email);
    gameStore.setNombreJugador(username);
    communicationManager.connect(); // Conecta el socket después del login
    await communicationManager.waitUntilConnected(); // Ensure socket is connected
    router.push('/game/select-room');
  } catch (error) {
    console.error('Error al iniciar sessió:', error);
    // La notificació d'error ja és gestionada per l'interceptor de communicationManager
  }
}
</script>

<template>
  <div class="login-background">
    <div class="themed-container">
      <h2>Entrar como Invitado</h2>
      <input
        maxlength="12"
        v-model="nom"
        type="text"
        placeholder="Escriu el teu nom"
        @keyup.enter="loginAsGuest"
      />
      <button class="btn" @click="loginAsGuest()">Entrar</button>
      <p>O</p>
      <p><router-link to="/login">Inicia sessió</router-link> o <router-link to="/register">Registra't</router-link></p>
    </div>
  </div>
</template>

<style src="../styles/styleAuth.css"></style>
