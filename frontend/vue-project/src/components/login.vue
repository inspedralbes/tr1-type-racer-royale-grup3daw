<script setup>
import { ref } from 'vue'

const nom = ref('')
const emit = defineEmits(['login'])

function login() {
  if (nom.value.trim() !== '') {
    emit('login', nom.value) 
  } else {
    alert('Nom no seleccionat, escull un nom')
  }
}
</script>

<template>
  <div class = "centrado">
    <div class="login-contenedor">
      <h2>Inici de sessió</h2>
      <input v-model="nom" type="text" placeholder="Escriu el teu nom" @keyup.enter="login"/>
      <button @click="login">Entrar</button>
    </div>
  </div>
</template>

<style src="../styles/style.css"></style>