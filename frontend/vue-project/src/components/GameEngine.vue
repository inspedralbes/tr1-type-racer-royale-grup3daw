<script setup>
import { ref } from 'vue'
import Login from './login.vue'
import Lobby from './lobby.vue'
import joc from './joc.vue'

const nombreJugador = ref('') 
const etapa = ref('login')    

function onLogin(nombre) {
  nombreJugador.value = nombre
  etapa.value = 'lobby'  
}

function iniciarJoc() {
  etapa.value = 'joc'
}
</script>

<template>
  <div>
    <Login v-if="etapa === 'login'" @login="onLogin" />

    <Lobby 
      v-else-if="etapa === 'lobby'" 
      :playerName="nombreJugador" 
      @startGame="iniciarJoc" 
    />

    <joc 
      v-else-if="etapa === 'joc'" 
      :playerName="nombreJugador" 
    />
  </div>
</template>
