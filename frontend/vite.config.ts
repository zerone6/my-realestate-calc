import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// frontend/vite.config.ts
export default defineConfig({
  base: '/calc/',
  plugins: [react()]
})
