
<script setup>
import { ref } from 'vue'
import { communicationManager } from '@/communicationManager'
import { useSessionStore } from '@/stores/session';

const nom = ref('')
const email = ref('')
const password = ref('')
const showEmailLogin = ref(false)
const emit = defineEmits(['login'])
const session = useSessionStore()

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
      session.setSession(token, username, email);
      const player = await communicationManager.connectAndRegister(username);
      emit('login', player)
    } else {
      const error = await response.json();
      alert(error.message);
    }
  } catch (error) {
    console.error('Error al iniciar sessió:', error)
    alert('Hi ha hagut un problema al servidor')
  }
}

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
      const player = await communicationManager.connectAndRegister(username);
      emit('login', player)
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
      <h2>Inici de sessió</h2>
      <div v-if="!showEmailLogin">
        <input
          maxlength="12"
          v-model="nom"
          type="text"
          placeholder="Escriu el teu nom"
          @keyup.enter="loginAsGuest"
        />
        <button class="login-button" @click="loginAsGuest()">Entrar com a convidat</button>
        <p>O</p>
        <button class="login-button" @click="showEmailLogin = true">Iniciar sessió amb email</button>
      </div>
      <div v-else>
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          @keyup.enter="login"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Contrasenya"
          @keyup.enter="login"
        />
        <button class="login-button" @click="login()">Entrar</button>
        <p>O</p>
        <button class="login-button" @click="showEmailLogin = false">Entrar com a convidat</button>
      </div>
      <p>No tens un compte? <router-link to="/register">Registra't</router-link></p>
    </div>
  </div>
</template>

<style src="../styles/styleLogin.css"></style>
