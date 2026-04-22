import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Load `.env` from monorepo root (same as `apps/api` when you pass env from shell)
const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: monorepoRoot,
})
