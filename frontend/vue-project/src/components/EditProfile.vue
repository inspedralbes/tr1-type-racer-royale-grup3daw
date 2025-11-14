<template>
  <div class="profile-background">
    <div class="centra-console-panel">
      <div class="profile-container hologram hologram-entrance">
        <h2>Editar perfil</h2>
        <button class="back-button" @click="goBack">←</button>
        <div v-if="loading">Carregant...</div>

        <div v-else>
          <div>
            <label>Email (no modificable)</label>
            <div>{{ form.email || '—' }}</div>
          </div>

          <div>
            <label>Nom: </label>
            <input v-model="form.username" type="text" maxlength="24" />
          </div>

          <div>
            <label>Nova contrasenya (opcional)</label>
            <input v-model="form.password" type="password" />
          </div>

          <div>
            <label>Color de l'avatar: </label>
            <select v-model="form.color">
              <option v-for="c in colors" :key="c.value" :value="c.value">{{ c.text }}</option>
            </select>
          </div>


          <div>
            <button @click="saveProfile">Desar</button>
            <button @click="confirmDelete">Esborrar compte</button>
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

const colors = [
  { text: 'Blau', value: 'Azul' },
  { text: 'Vermell', value: 'Roja' },
  { text: 'Verd', value: 'Verde' },
  { text: 'Groc', value: 'Amarilla' }
]

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
      notificationStore.pushNotification({ type: 'error', message: 'No s\'ha trobat el perfil. Si us plau, inicia sessió.' })
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
    notificationStore.pushNotification({ type: 'success', message: 'Perfil actualitzat correctament.' })
    // Clear password field
    form.value.password = ''
  } catch (e) {
    // error notifications are handled by communicationManager interceptor
    console.error('Error en actualitzar el perfil', e)
  }
}

const confirmDelete = async () => {
  if (!confirm('Estàs segur que vols eliminar el teu compte? Aquesta acció és irreversible.')) return
  try {
    await communicationManager.deleteAccount()
    notificationStore.pushNotification({ type: 'success', message: 'Compte eliminat correctament.' })
    // Clear local session and disconnect
    session.clearSession()
    communicationManager.disconnect()
    router.push('/login')
  } catch (e) {
    console.error('Error en esborrar el compte', e)
  }
}
</script>

<style src="../styles/styleProfile.css"></style>