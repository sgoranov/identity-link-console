import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '')

  const bffHost = (() => {
    const bffUrl = env.VITE_BFF_BASE_URL

    if (!bffUrl) {
      return undefined
    }

    try {
      return new URL(bffUrl).hostname
    } catch {
      return bffUrl
    }
  })()

  const allowedHosts: string[] = [
    ...(bffHost ? [bffHost] : []),
    'localhost',
    '127.0.0.1',
  ]

  return {
    plugins: [react()],
    base: '/admin-console/',
    server: {
      host: true,
      port: 9005,
      strictPort: true,
      // Allow local reverse-proxying (e.g. a proxy container reaching the host at host.docker.internal:9005)
      // and the existing production-ish host.
      allowedHosts: allowedHosts,
    },
    preview: {
      host: true,
      port: 9005,
      strictPort: true,
      allowedHosts: allowedHosts,
    },
    build: {
      chunkSizeWarningLimit: 1000,
    },
  }
})


