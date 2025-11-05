
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { communicationManager } from '@/communicationManager'
import { useSessionStore } from '@/stores/session';

const email = ref('')
const password = ref('')
const session = useSessionStore()
const router = useRouter()

// Limpia los campos cuando el componente se monta. Se usa un setTimeout
// para asegurar que se ejecute después de cualquier autocompletado del navegador.
onMounted(() => {
  setTimeout(() => {
    email.value = '';
    password.value = '';
  }, 10);
});

const login = async () => {
  if (email.value.trim() === '' || password.value.trim() === '') {
    alert('Por favor, introduce tu email y contraseña.')
    return
  }

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.value, password: password.value }),
    });

    if (response.ok) {
      const { token, username, email } = await response.json();
      console.log('Login successful:', { token, username, email });
      session.setSession(token, username, email);
      communicationManager.connect(); // Conecta el socket después del login
      router.push('/game');
    } else {
      const error = await response.json();
      alert(error.message);
    }
  } catch (error) {
    console.error('Error al iniciar sessió:', error)
    alert('Hi ha hagut un problema al servidor')
  }
}

const goToGuestLogin = () => {
  router.push('/guest-login');
}
</script>

<template>
  <div class="login-background">
    <div class="login-contenedor">
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
      <button class="login-button" @click="login()">Entrar</button>
      <p>O</p>
      <button class="login-button" @click="goToGuestLogin()">Entrar com a convidat</button>
      <p>No tens un compte? <router-link to="/register">Registra't</router-link></p>
    </div>
  </div>
</template>

<style src="../styles/styleLogin.css"></style>
