import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      /** Force the browser bundle to use the ESM TS source of `@tracker/shared` via a browser-safe entry. The default `main` points to a CommonJS `dist/index.js` that references `exports` (breaks in the browser) and pulls Node-only deps (`crypto`, `fs`, `nspell`, `dictionary-es`). */
      '@tracker/shared': resolve(__dirname, '../../packages/shared/src/browser.ts'),
    },
  },
  /** `@tracker/shared` pulls node-only deps (e.g. `dictionary-es` with top-level await) transitively via its CJS dist index. Those are never executed in the browser but esbuild still transforms them during dep pre-bundling, so we raise the target. */
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
