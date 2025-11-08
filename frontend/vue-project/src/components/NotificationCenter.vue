<template>
  <div class="notification-center">
    <div v-for="note in notificationStore.notifications" :key="note.id" :class="['notification', note.type]">
      <div class="message">{{ note.message }}</div>
      <button class="close" @click="notificationStore.removeNotification(note.id)">×</button>
    </div>
  </div>
</template>

<script setup>
import { useNotificationStore } from '../stores/notification';
const notificationStore = useNotificationStore();
</script>

<style scoped>
.notification-center {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.notification {
  min-width: 240px;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.notification.info { background: #1976d2; }
.notification.success { background: #2e7d32; }
.notification.error { background: #c62828; }
.notification .close {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.9);
  font-size: 1.1rem;
  cursor: pointer;
}
.notification .message { flex: 1; margin-right: 0.5rem; }
</style>
