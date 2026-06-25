/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Port 5173 is fixed so it matches the origin allowlisted in the Privy/Pimlico dashboards.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
