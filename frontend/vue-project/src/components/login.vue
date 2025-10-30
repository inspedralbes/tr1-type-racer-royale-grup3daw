<script setup>
import { communicationManager } from '@/communicationmanager'
import { ref } from 'vue'

const nom = ref('')
const emit = defineEmits(['login'])

function login() {
  if (nom.value.trim() !== '') {
    communicationManager.login(nom.value)
    .then(response => {
      if (!response.ok) throw new Error('Error nom')
      return response.json()
    })
    .then(data => {
      console.log('respuesta del servidor: ', data)
      emit('login', nom.value) 
    })
    .catch(error => {
      console.log('Error al enviar nombre: ', error)
      alert('Hi ha hagut un problema al servidor')
    }) 
    emit('login', nom.value) 
  } else {
    alert('Nom no seleccionat, escull un nom')
  }
}
</script>

<template>
    <div class="login-contenedor">
      <h2>Inici de sessió</h2>
      <input v-model="nom" type="text" placeholder="Escriu el teu nom" @keyup.enter="login"/>
      <button @click="login">Entrar</button>
    </div>
</template>

<style src="../styles/style.css"></style>