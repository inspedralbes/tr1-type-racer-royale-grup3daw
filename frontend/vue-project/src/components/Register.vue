
<template>
  <div class="main-background">
    <div class="themed-container">
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
      <p>O</p>
      <button class="btn" @click="goToGuestLogin()">Entrar com a convidat</button>
      <p>Ja tens un compte? <router-link to="/login">Inicia sessió</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { communicationManager } from '@/communicationManager';

const username = ref('');
const email = ref('');
const password = ref('');
const router = useRouter();

onMounted(async () => {
  await communicationManager.updatePlayerPage('register');
});

const register = async () => {
  if (username.value.trim() === '' || email.value.trim() === '' || password.value.trim() === '') {
    alert('Si us plau, omple tots els camps.');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value,
      }),
    });

    if (response.ok) {
      alert('Registre exitós. Si us plau, revisa el teu correu per a verificar el teu compte.');
      router.push('/login');
    } else {
      const error = await response.json();
      alert(error.message);
    }
  } catch (error) {
    console.error('Error en el registre:', error);
    alert('Hi ha hagut un problema al servidor.');
  }
};

const goToGuestLogin = () => {
  router.push('/guest-login');
}
</script>

<style src="../styles/styleLogin.css"></style>
