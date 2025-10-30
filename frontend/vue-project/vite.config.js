import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // Añade esta sección para habilitar el hot-reloading en Docker
  server: {
    watch: {
      // Usa polling en lugar de los eventos del sistema de ficheros
      usePolling: true,
    },
    host: true, // Asegura que el servidor sea accesible desde fuera del contenedor
  },
})
