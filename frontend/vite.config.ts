import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@paddleocr/paddleocr-js'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5275',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5275',
        changeOrigin: true,
      },
    },
  },
})
