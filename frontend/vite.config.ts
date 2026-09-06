import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
  ],
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
