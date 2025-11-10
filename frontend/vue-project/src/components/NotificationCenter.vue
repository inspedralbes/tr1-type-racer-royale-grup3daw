<template>
  <TransitionGroup tag="div" name="hologram-expand" class="notification-center">
    <div v-for="note in notificationStore.notifications" :key="note.id" :class="['notification', note.type]">
      <div class="message">{{ note.message }}</div>
      <button class="close" @click="notificationStore.removeNotification(note.id)">×</button>
    </div>
  </TransitionGroup>
</template>

<script setup>
import { useNotificationStore } from '../stores/notification';
const notificationStore = useNotificationStore();
</script>

<style src="../styles/styleNotification.css"></style>