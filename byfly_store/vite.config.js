import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: '.',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['localhost', 'https://byfly.2bd.net', '52.65.160.100'],
  },
})
