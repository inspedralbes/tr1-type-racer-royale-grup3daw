<script setup>
import { ref } from 'vue'
import { communicationManager } from '@/communicationManager'

const nom = ref('')
const emit = defineEmits(['login'])

async function login() {
  if (nom.value.trim() === '') {
    alert('Nom no seleccionat, escull un nom')
    return
  }

  try {
    // 1️⃣ Conectar socket y registrar jugador
    const socketId = await communicationManager.connectAndRegister(nom.value)
    console.log('Socket ID assignat:', socketId)

    // 2️⃣ Llamar al backend con nombre y socketId
    const response = await communicationManager.login(nom.value, socketId)
    const player = response.data // el servidor devuelve el objeto player

    console.log('Player rebut del servidor:', player)

    // 3️⃣ Guardar el objeto player y socketId en localStorage
    localStorage.setItem('player', JSON.stringify(player))
    localStorage.setItem('socketId', socketId)

    // 4️⃣ Emitir al padre
    emit('login', player)
  } catch (error) {
    console.error('Error al iniciar sessió:', error)
    alert('Hi ha hagut un problema al servidor')
  }
}
</script>

<template>
  <div class="login-contenedor">
    <h2>Inici de sessió</h2>
    <input
      maxlength="12"
      v-model="nom"
      type="text"
      placeholder="Escriu el teu nom"
      @keyup.enter="login"
    />
    <button class="login-button" @click="login">Entrar</button>
  </div>
</template>

<style src="../styles/styleLogin.css"></style>
