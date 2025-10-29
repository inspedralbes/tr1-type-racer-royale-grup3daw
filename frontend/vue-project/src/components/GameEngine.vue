<script setup>
import { ref } from 'vue'
import Login from './login.vue'
import Lobby from './lobby.vue'

const nombreJugador = ref('') 
const etapa = ref('login')    

function onLogin(nombre) {
  nombreJugador.value = nombre
  etapa.value = 'lobby'  
}
</script>

<template>
  <div>    
    <Login v-if="etapa === 'login'" @login="onLogin" />

    <Lobby v-else :playerName="nombreJugador" />
  </div>
</template>
