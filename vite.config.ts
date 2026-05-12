import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 9005,
    strictPort: true,
    // Allow local reverse-proxying (e.g. a proxy container reaching the host at host.docker.internal:9005)
    // and the existing production-ish host.
    allowedHosts: ['ui.example.com', 'host.docker.internal', 'localhost', '127.0.0.1'],
  },
  preview: {
    host: true,
    port: 9005,
    strictPort: true,
    allowedHosts: ['ui.example.com', 'host.docker.internal', 'localhost', '127.0.0.1'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
