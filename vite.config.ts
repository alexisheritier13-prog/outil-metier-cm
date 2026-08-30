/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/load-env.ts', 'src/test/setup.ts'],
    css: false,
    // Tests d'intégration DB : lancés à part (`npm run test:rls`), en série,
    // car ils partagent un unique projet Supabase.
    exclude: ['node_modules/**', 'dist/**', 'tests/integration/**'],
  },
});
