import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Reuse the app's Vite config (React and Paraglide plugins) so tests compile
// the code the same way the build does.
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
      // Page tests click through antd forms and drawers, which is slow in jsdom,
      // and several times slower again when collecting coverage.
      testTimeout: 30000,
      restoreMocks: true,
      unstubGlobals: true,
      unstubEnvs: true,
      coverage: {
        // Still report coverage when some tests fail.
        reportOnFailure: true,
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/paraglide/**', 'src/test/**', 'src/**/*.test.{ts,tsx}', 'src/main.tsx'],
      },
    },
  }),
)
