<script setup>
import { ref } from 'vue'
import Login from './login.vue'
import Lobby from './lobby.vue'
import Joc from './joc.vue'
import Paginafinal from './paginafinal.vue'


const nombreJugador = ref('') 
const etapa = ref('login')    

function onLogin(nombre) {
  nombreJugador.value = nombre
  etapa.value = 'lobby'  
}
function startGame() {
etapa.value = 'joc'
}

</script>

<template>
  <div>    
    <Login v-if="etapa === 'login'" @login="onLogin" />

    <Lobby v-else-if = "etapa === 'lobby'" :playerName = "nombreJugador" @startGame="startGame" />
    
    <Joc v-else-if="etapa === 'joc'" />
  </div>
</template>
