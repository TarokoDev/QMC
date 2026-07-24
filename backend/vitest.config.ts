import { defineConfig } from 'vitest/config'

// Vitest resolves the NodeNext-style `./x.js` specifiers in .ts source
// natively, so no extra module mapping is needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
