
<template>
  <div class="login-background">
    <div class="login-contenedor">
      <h2>Verificació de correu</h2>
      <p v-if="message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const message = ref('Verificant el teu correu...');

onMounted(async () => {
  const token = route.query.token;

  if (!token) {
    message.value = 'Token de verificació no trobat.';
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/auth/verify-email?token=${token}`);

    if (response.ok) {
      message.value = 'Correu verificat amb èxit. Ja pots iniciar sessió.';
    } else {
      const error = await response.json();
      message.value = error.message;
    }
  } catch (error) {
    console.error('Error en la verificació del correu:', error);
    message.value = 'Hi ha hagut un problema al servidor.';
  }
});
</script>

<style src="../styles/styleLogin.css"></style>
