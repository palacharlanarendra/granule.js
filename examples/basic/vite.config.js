import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const coreEntry = fileURLToPath(new URL('../../src/index.ts', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'granule-js': coreEntry,
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
})
