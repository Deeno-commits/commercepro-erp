
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // CRITIQUE pour Electron : utilise des chemins relatifs
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets'
  }
});
