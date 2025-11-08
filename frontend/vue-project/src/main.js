import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setupSocketListeners } from './communicationManager'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')
// Initialize socket listeners after Pinia and the router are set up
setupSocketListeners(router)
