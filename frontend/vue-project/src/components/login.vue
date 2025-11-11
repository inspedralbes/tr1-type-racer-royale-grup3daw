
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { communicationManager } from '../communicationManager.js'
import { useSessionStore } from '@/stores/session.js';
import { useGameStore } from '@/stores/game';
import { useNotificationStore } from '../stores/notification';

const email = ref('')
const password = ref('')
const session = useSessionStore()
const gameStore = useGameStore()
const router = useRouter()

// Limpia los campos cuando el componente se monta. Se usa un setTimeout
// para asegurar que se ejecute después de cualquier autocompletado del navegador.
onMounted(async () => {
  // When visiting the login page we should clear any existing session/socket
  // so that the app treats the user as a new user.
  try {
    communicationManager.logout();
  } catch (e) {}
  try {
    communicationManager.disconnect();
  } catch (e) {}
  await communicationManager.updatePlayerPage('login');
  setTimeout(() => {
    email.value = '';
    password.value = '';
  }, 10);
});

const login = async () => {
  if (email.value.trim() === '' || password.value.trim() === '') {
    const notificationStore = useNotificationStore();
    notificationStore.pushNotification({ type: 'error', message: 'Por favor, introduce tu email y contraseña.' });
    return
  }

  try {
    const response = await communicationManager.login(email.value, password.value);
    const { token, username, email: userEmail } = response.data;
    // console.log('Login successful:', { token, username, email: userEmail });
    session.setSession(token, username, userEmail);
    gameStore.setNombreJugador(username);
    communicationManager.connect(); // Conecta el socket después del login
    await communicationManager.waitUntilConnected(); // Ensure socket is connected
    router.push('/game/select-room');
  } catch (error) {
    console.error('Error al iniciar sessió:', error);
    // La notificació d'error ja és gestionada per l'interceptor de communicationManager
  }
}

const goToGuestLogin = () => {
  router.push('/guest-login');
}
</script>
<template>
  <div class="login-background">
    <div class="centra-console-panel">
      <div class="login-container hologram">
        <h2>Inici de sessió</h2>
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          @keyup.enter="login"
          autocomplete="no-autofill"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Contrasenya"
          @keyup.enter="login"
          autocomplete="new-password"
        />
        
        <div class="hologram-button-group">
          <button class="btn" @click="login()">Entrar</button>
          <button class="btn" @click="goToGuestLogin()">Entrar com a convidat</button>
        </div>
        <p>No tens un compte? <router-link to="/register">Registra't</router-link></p>
      </div>
    </div>
  </div>
</template>

<style src="../styles/styleAuth.css"></style>
