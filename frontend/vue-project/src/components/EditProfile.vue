<template>
  <div class="profile-background">
    <div class="centra-console-panel">
      <div class="profile-container hologram">
        <h2>Editar perfil</h2>
        <button class="back-button" @click="goBack">←</button>
        <div v-if="loading">Cargando...</div>

        <div v-else>
          <div>
            <label>Email (no modificable)</label>
            <div>{{ form.email || '—' }}</div>
          </div>

          <div>
            <label>Nombre: </label>
            <input v-model="form.username" type="text" maxlength="24" />
          </div>

          <div>
            <label>Nueva contraseña (opcional)</label>
            <input v-model="form.password" type="password" />
          </div>

          <div>
            <label>Color de avatar: </label>
            <select v-model="form.color">
              <option v-for="c in colors" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>


          <div>
            <button @click="saveProfile">Guardar</button>
            <button @click="confirmDelete">Borrar cuenta</button>
          </div>
        </div>
      </div>
    </div>
          <div class="nave-view">
            <img :src="avatarSrc" alt="preview"/>
      </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { communicationManager } from '@/communicationManager'
import { useNotificationStore } from '@/stores/notification'

const session = useSessionStore()
const router = useRouter()
const notificationStore = useNotificationStore()

const loading = ref(true)

const colors = ['Azul', 'Roja', 'Verde', 'Amarilla']

const goBack = () => {
  router.back() 
}

const form = ref({
  id: null,
  username: '',
  email: '',
  password: '',
  avatar: 'nave',
  color: 'Azul',
})

const avatarSrc = computed(() => {
  // Build image path from avatar + color. Filenames in /src/img are like naveAzul.png
  try {
    return new URL(`../img/${form.value.avatar}${form.value.color}.png`, import.meta.url).href
  } catch (e) {
    return ''
  }
})

onMounted(async () => {
  // Only allow access if logged in
  if (!session.token) {
    router.push('/login')
    return
  }

  try {
    const res = await communicationManager.getCurrentUser()
    if (res && res.data) {
      const u = res.data
      form.value.id = u.id
      form.value.username = u.username
      form.value.email = u.email
      form.value.avatar = u.avatar || 'nave'
      form.value.color = u.color || 'Azul'
    }
  } catch (e) {
    // getCurrentUser will show notification if error; if 404 redirect to login
    if (e.response && e.response.status === 404) {
      notificationStore.pushNotification({ type: 'error', message: 'No se encontró el perfil. Por favor inicia sesión.' })
      session.clearSession()
      communicationManager.disconnect()
      router.push('/login')
      return
    }
  } finally {
    loading.value = false
  }
})

const saveProfile = async () => {
  // Build payload
  const payload = {
    username: form.value.username,
    avatar: form.value.avatar,
    color: form.value.color,
  }
  if (form.value.password && form.value.password.trim().length > 0) {
    payload.password = form.value.password
  }

  try {
    await communicationManager.updateCurrentUser(payload)
    // Update local session name if changed
    if (form.value.username) {
      session.setPlayerName(form.value.username)
    }
    notificationStore.pushNotification({ type: 'success', message: 'Perfil actualizado correctamente.' })
    // Clear password field
    form.value.password = ''
  } catch (e) {
    // error notifications are handled by communicationManager interceptor
    console.error('Error updating profile', e)
  }
}

const confirmDelete = async () => {
  if (!confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible.')) return
  try {
    await communicationManager.deleteAccount()
    notificationStore.pushNotification({ type: 'success', message: 'Cuenta eliminada correctamente.' })
    // Clear local session and disconnect
    session.clearSession()
    communicationManager.disconnect()
    router.push('/login')
  } catch (e) {
    console.error('Error deleting account', e)
  }
}
</script>

<style src="../styles/styleProfile.css"></style>