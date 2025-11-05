
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { communicationManager } from '@/communicationManager'
import { useSessionStore } from '@/stores/session';

const nom = ref('')
const session = useSessionStore()
const router = useRouter()

const loginAsGuest = async () => {
  if (nom.value.trim() === '') {
    alert('Por favor, introduce un nombre para continuar.')
    return
  }

  try {
    const response = await fetch('http://localhost:3000/api/auth/login-as-guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: nom.value }),
    });

    if (response.ok) {
      const { token, username, email } = await response.json();
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
</script>

<template>
  <div class="login-background">
    <div class="login-contenedor">
      <h2>Entrar como Invitado</h2>
      <input
        maxlength="12"
        v-model="nom"
        type="text"
        placeholder="Escriu el teu nom"
        @keyup.enter="loginAsGuest"
      />
      <button class="login-button" @click="loginAsGuest()">Entrar</button>
      <p>O</p>
      <p><router-link to="/login">Inicia sessió</router-link> o <router-link to="/register">Registra't</router-link></p>
    </div>
  </div>
</template>

<style src="../styles/styleLogin.css"></style>
