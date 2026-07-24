import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Merges vite.config.ts so the `@` alias and `__APP_VERSION__` define
// behave identically in tests and in the app build.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }),
)
