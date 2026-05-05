import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
          ],
          'charts': ['recharts'],
          'motion': ['framer-motion'],
          'pdf': ['jspdf', 'html2canvas'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'supabase': ['@supabase/supabase-js'],
          'query': ['@tanstack/react-query'],
        },
      },
    },
  },
})
