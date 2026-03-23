import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'popup',
  build: {
    outDir: '../dist/popup',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'popup'),
      '@components': resolve(__dirname, 'components'),
    },
  },
});
