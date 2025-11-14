
<template>
  <div class="login-background">
    <div class="centra-console-panel">
      <div class="login-container hologram hologram-entrance">
        <h2>Registre</h2>
        <input
          v-model="username"
          type="text"
          placeholder="Nom d'usuari"
        />
        <input
          v-model="email"
          type="email"
          placeholder="Email"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Contrasenya"
        />
        <button class="btn" @click="register">Registrar-se</button>
        <p>Ja tens un compte? <router-link to="/login">Inicia sessió</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { communicationManager } from '@/communicationManager';
import { useNotificationStore } from '../stores/notification';

const username = ref('');
const email = ref('');
const password = ref('');
const router = useRouter();

onMounted(async () => {
  await communicationManager.updatePlayerPage('register');
});

const register = async () => {
  if (username.value.trim() === '' || email.value.trim() === '' || password.value.trim() === '') {
    const notificationStore = useNotificationStore();
    notificationStore.pushNotification({ type: 'error', message: 'Si us plau, omple tots els camps.' });
    return;
  }

  try {
    await communicationManager.register(username.value, email.value, password.value);
    const notificationStore = useNotificationStore();
    notificationStore.pushNotification({ type: 'success', message: 'Registre exitós.' });
    router.push('/login');
  } catch (error) {
    // L'interceptor d'errors de communicationManager ja hauria mostrat una notificació
    console.error('Error en el registre:', error);
  }
};

const goToGuestLogin = () => {
  router.push('/guest-login');
}
</script>

<style src="../styles/styleAuth.css"></style>
