import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        jingzi: path.resolve('index.dev.html'),
        tanshe: path.resolve('tanshe/source.html'),
      },
    },
  },
});
