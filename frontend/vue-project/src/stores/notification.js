import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([]);
  let nextId = 1;

  function pushNotification({ type = 'info', message = '', timeout = 5000 } = {}) {
    const id = nextId++;
    notifications.value.push({ id, type, message });
    if (timeout > 0) {
      setTimeout(() => removeNotification(id), timeout);
    }
    return id;
  }

  function removeNotification(id) {
    const idx = notifications.value.findIndex(n => n.id === id);
    if (idx !== -1) notifications.value.splice(idx, 1);
  }

  function clear() {
    notifications.value.splice(0, notifications.value.length);
  }

  return { notifications, pushNotification, removeNotification, clear };
});
