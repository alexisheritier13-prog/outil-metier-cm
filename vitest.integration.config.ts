import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests d'intégration DB : un seul projet Supabase partagé → exécution en série.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/test/load-env.ts'],
    include: ['tests/integration/**/*.integration.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 40_000,
  },
});
