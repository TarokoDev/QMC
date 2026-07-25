import path from 'node:path'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const packageJsonPath = path.resolve(__dirname, './package.json')
const { version } = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

/**
 * `define` is resolved once when the dev server boots, and package.json is read
 * here rather than imported, so Vite doesn't treat it as a config dependency and
 * won't restart on its own. Without this, bumping the version leaves the footer
 * showing the old number until you manually restart `npm run dev`.
 */
function restartOnVersionBump(): Plugin {
  return {
    name: 'restart-on-version-bump',
    configureServer(server) {
      server.watcher.add(packageJsonPath)
      server.watcher.on('change', (file) => {
        if (path.resolve(file) === packageJsonPath) server.restart()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), restartOnVersionBump()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
