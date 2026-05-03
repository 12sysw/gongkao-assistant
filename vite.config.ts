import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('@tencentcloud/chat') || id.includes('tim-upload-plugin')) {
            return 'chat-sdk';
          }

          if (id.includes('tesseract.js')) {
            return 'ocr-sdk';
          }

          if (
            id.includes('react') ||
            id.includes('scheduler') ||
            id.includes('react-router') ||
            id.includes('@tanstack/react-query') ||
            id.includes('zustand')
          ) {
            return 'react-vendor';
          }

          if (
            id.includes('lucide-react') ||
            id.includes('@radix-ui') ||
            id.includes('class-variance-authority') ||
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('sonner') ||
            id.includes('react-hook-form') ||
            id.includes('dayjs') ||
            id.includes('zod')
          ) {
            return 'ui-vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
