import { defineConfig, devices } from '@playwright/test';

/**
 * E2E — parcours critiques + audit axe (Story 9.5). Utilise le **Chrome système**
 * (`channel: 'chrome'`) : pas de téléchargement de navigateur (`npx playwright
 * install` non requis). Le serveur de dev est réutilisé s'il tourne déjà.
 *
 * Auto-skip si les identifiants de démo ne sont pas fournis (`E2E_EMAIL` /
 * `E2E_PASSWORD`, ou `.env.test.local`). Non branché en CI pour l'instant.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    channel: 'chrome',
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: 'npm run dev',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
