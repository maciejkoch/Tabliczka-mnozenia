import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/Tabliczka-mnozenia/' : '/',
  build: { target: 'es2022', chunkSizeWarningLimit: 700 },
});
