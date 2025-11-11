<template>
  <TransitionGroup tag="div" name="hologram-expand" class="notification-center">
    <div v-for="note in toastNotifications" :key="note.id" :class="['notification', note.type]">
      
      <div class="notification-content">
        <div class="message">{{ note.message }}</div>
        <button class="close" @click="notificationStore.removeNotification(note.id)">×</button>
      </div>

    </div>
  </TransitionGroup>

  <div v-if="errorNotifications.length > 0" class="error-modal-perspective-wrapper">

    <div :class="['notification', 'error']" :key="errorNotifications[0].id">
      <div class="notification-content">
        <h3 class="error-title">Error Crítico</h3>
        <div class="message">{{ errorNotifications[0].message }}</div>
        <div class="hologram-button-group">
          <button class="btn" @click="notificationStore.removeNotification(errorNotifications[0].id)">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNotificationStore } from '../stores/notification';
import { computed } from 'vue'; // Import computed

const notificationStore = useNotificationStore();

// Create computed properties to split notifications
const toastNotifications = computed(() => 
  notificationStore.notifications.filter(note => note.type !== 'error')
);

const errorNotifications = computed(() => 
  notificationStore.notifications.filter(note => note.type === 'error')
);
</script>

<style src="../styles/styleNotification.css"></style>