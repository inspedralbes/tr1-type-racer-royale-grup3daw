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
        <h3 class="error-title">Error Crític</h3>
        <div class="message">{{ errorNotifications[0].message }}</div>
        <div class="hologram-button-group">
          <button class="btn" @click="dismissError">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNotificationStore } from '../stores/notification';
// **** NEW: Import watch, ref, and onUnmounted ****
import { computed, watch, ref, onUnmounted } from 'vue';

const notificationStore = useNotificationStore();

// --- Computed properties are unchanged ---
const toastNotifications = computed(() => 
  notificationStore.notifications.filter(note => note.type !== 'error')
);

const errorNotifications = computed(() => 
  notificationStore.notifications.filter(note => note.type === 'error')
);

// **** NEW: A ref to hold our timer ID ****
const errorTimer = ref(null);

// **** NEW: Function to manually dismiss the error ****
const dismissError = () => {
  // If a timer is running, clear it
  if (errorTimer.value) {
    clearTimeout(errorTimer.value);
    errorTimer.value = null;
  }
  // Manually remove the notification
  if (errorNotifications.value.length > 0) {
    notificationStore.removeNotification(errorNotifications.value[0].id);
  }
};

// **** NEW: Watcher to start the 10-second timer ****
watch(errorNotifications, (newErrors) => {
  // First, clear any old timer that might still be running
  if (errorTimer.value) {
    clearTimeout(errorTimer.value);
    errorTimer.value = null;
  }

  // If a new error has appeared
  if (newErrors.length > 0) {
    const errorIdToDismiss = newErrors[0].id;

    // Start a new 10-second timer
    errorTimer.value = setTimeout(() => {
      // After 10s, check if that *same error* is still on screen
      if (errorNotifications.value.length > 0 && errorNotifications.value[0].id === errorIdToDismiss) {
        // If it is, remove it
        notificationStore.removeNotification(errorIdToDismiss);
      }
    }, 10000); // 10,000 milliseconds = 10 seconds
  }
});

// **** NEW: Cleanup timer when the component is destroyed ****
onUnmounted(() => {
  if (errorTimer.value) {
    clearTimeout(errorTimer.value);
  }
});
</script>

<style src="../styles/styleNotification.css"></style>