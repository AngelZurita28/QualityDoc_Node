import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expone el proyecto hacia fuera del contenedor
    port: 5173,
    watch: {
      usePolling: true // Necesario en Windows para que detecte los cambios en vivo al usar volúmenes
    }
  }
})