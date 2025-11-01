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
export default defineConfig({
  plugins: [
    vue(), // Plugin oficial para habilitar el soporte de componentes de un solo fichero (SFC) de Vue.
    vueDevTools(), // Habilita las herramientas de desarrollo de Vue en el navegador.
  ],
  resolve: {
    // Configuración de alias para las rutas de importación.
    alias: {
      // Permite usar '@' como un atajo para 'src/', facilitando las importaciones.
      // Ejemplo: import Component from '@/components/Component.vue'
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // Configuración del servidor de desarrollo de Vite.
  server: {
    watch: {
      // Habilita el "polling" para la detección de cambios en los ficheros.
      // Esto es necesario para que el hot-reloading (HMR) funcione correctamente
      // cuando la aplicación se ejecuta dentro de un contenedor Docker.
      usePolling: true,
    },
    host: true, // Hace que el servidor sea accesible desde fuera del contenedor (ej. desde el navegador en el host).
  },
})
