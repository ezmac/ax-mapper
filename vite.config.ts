import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.APP_BASE ?? '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  server: process.env.VITE_API_MODE ? {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.SERVER_PORT ?? '3001'}`,
        changeOrigin: true,
      },
    },
  } : undefined,
})
