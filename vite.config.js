import { defineConfig } from 'vite';

const pages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: pages ? '/Games/' : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
