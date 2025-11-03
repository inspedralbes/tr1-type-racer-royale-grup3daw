/**
 * Fichero: vite.config.js
 * Descripción: Este es el fichero de configuración para Vite, el empaquetador y servidor
 * de desarrollo utilizado para el proyecto de Vue.js. Define cómo se construye y se sirve
 * la aplicación en el entorno de desarrollo.
 */
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Para más información sobre la configuración de Vite: https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    watch: {
      usePolling: true,
    },
    host: true,
    headers: mode === 'development' ? {
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:3000 ws://localhost:3000;",
    } : {},
  },
}));
