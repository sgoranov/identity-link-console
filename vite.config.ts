import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '')
  let bffHost = env.VITE_BFF_BASE_URL
  if (bffHost.startsWith('http://') || bffHost.startsWith('https://')) {
    bffHost = new URL(bffHost).hostname
  }

  return {
    plugins: [react()],
    base: '/admin-console/',
    server: {
      host: true,
      port: 9005,
      strictPort: true,
      // Allow local reverse-proxying (e.g. a proxy container reaching the host at host.docker.internal:9005)
      // and the existing production-ish host.
      allowedHosts: [bffHost, 'localhost', '127.0.0.1'],
    },
    preview: {
      host: true,
      port: 9005,
      strictPort: true,
      allowedHosts: [bffHost, 'localhost', '127.0.0.1'],
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
  }
})


