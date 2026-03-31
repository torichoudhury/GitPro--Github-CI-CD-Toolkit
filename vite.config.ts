import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: 'backend',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'extension/dist',
    emptyOutDir: true
  }
});
