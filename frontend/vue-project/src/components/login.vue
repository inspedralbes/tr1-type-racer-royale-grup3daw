<script setup>
/**
 * Fichero: login.vue
 * Descripción: Este componente representa la pantalla de inicio de sesión.
 * Permite al usuario introducir un nombre y, al hacer clic en "Entrar", inicia el proceso
 * de conexión y registro con el servidor.
 *
 * Funcionalidades:
 * - Captura el nombre de usuario introducido.
 * - Valida que el nombre no esté vacío.
 * - Utiliza `communicationManager` para conectar el socket y registrar al jugador en el backend.
 * - Emite un evento `login` al componente padre (`GameEngine.vue`) con los datos del jugador
 *   recibidos del servidor, para que el padre pueda continuar con el flujo del juego.
 */
import { ref } from 'vue'
import { communicationManager } from '@/communicationManager'

// `nom` es una referencia reactiva para almacenar el valor del campo de entrada.
const nom = ref('')
// `emit` se usa para enviar eventos al componente padre.
const emit = defineEmits(['login'])

const login = async () => {
  // Validación simple para asegurar que el usuario ha introducido un nombre.
  if (nom.value.trim() === '') {
    alert('Por favor, introduce un nombre para continuar.')
    return
  }

  try {
    // 1. Conecta el socket y se registra en el backend.
    // `connectAndRegister` se encarga de la conexión del socket y de llamar al endpoint `/login`.
    // El backend gestionará si es un nuevo login o una reconexión.
    const player = await communicationManager.connectAndRegister(nom.value);
    console.log('Jugador recibido del servidor:', player);

    // 2. Emite el evento 'login' al componente padre (`GameEngine`).
    // Esto le indica al padre que el login fue exitoso y le pasa los datos del jugador.
    emit('login', player)
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
    <input
      maxlength="12"
      v-model="nom"
      type="text"
      placeholder="Escriu el teu nom"
      @keyup.enter="login"
    />
    <button class="login-button" @click="login()">Entrar</button>
  </div>
  </div>
</template>

<style src="../styles/styleLogin.css"></style>
