import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Keep generated caches separate from the legacy tracked .vite directory.
  cacheDir: "node_modules/.cache/vite",
  plugins: [
    react(),
    tailwindcss(),
  ],
})