import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    // Better HMR handling
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false, // Set to true if on Windows/network drive
    },
  },
  // Clear cache on dependency changes
  optimizeDeps: {
    force: false,
  },
})