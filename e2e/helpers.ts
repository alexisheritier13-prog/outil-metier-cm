import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, type Page, test } from '@playwright/test';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core'), 'utf-8');

export const E2E_EMAIL = process.env.E2E_EMAIL ?? '';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? '';
export const E2E_CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL ?? '';

/** Ignore la suite si aucun identifiant de démo n'est fourni. */
export const requireCreds = () =>
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'E2E_EMAIL / E2E_PASSWORD non fournis');

export async function login(page: Page, email = E2E_EMAIL, password = E2E_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill(password);
  await Promise.all([
    page.waitForURL((u) => /\/(app|portail)/.test(u.pathname), { timeout: 15_000 }),
    page.getByRole('button', { name: /se connecter|connexion/i }).click(),
  ]);
}

interface AxeResult {
  violations: {
    id: string;
    impact: string | null;
    help: string;
    nodes: { target: string[] }[];
  }[];
}

/**
 * Lance axe-core sur la page et échoue sur toute violation `serious` ou `critical`.
 * Les règles `moderate` / `minor` sont rapportées en console sans bloquer.
 */
export async function checkA11y(page: Page, context?: string) {
  // Laisse les animations d'entrée (fade/slide) se terminer avant de mesurer le
  // contraste — sinon axe lit une opacité transitoire.
  await page.waitForTimeout(450);
  await page.addScriptTag({ content: AXE_SOURCE });
  const result = (await page.evaluate(async () => {
    // @ts-expect-error axe est injecté globalement
    return window.axe.run(document, {
      resultTypes: ['violations'],
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    });
  })) as AxeResult;

  const blocking = result.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (blocking.length && process.env.E2E_A11Y_DUMP) {
    console.log(
      `\n=== a11y ${context} ===\n` +
        blocking
          .map(
            (v) =>
              `${v.id} [${v.impact}] ${v.help}\n` +
              v.nodes.map((n) => `   → ${n.target.join(' ')}`).join('\n'),
          )
          .join('\n'),
    );
  }
  const minor = result.violations.filter((v) => !blocking.includes(v));
  if (minor.length) {
    console.log(
      `[a11y${context ? ` · ${context}` : ''}] non bloquant :`,
      minor.map((v) => `${v.id} (${v.impact})`).join(', '),
    );
  }
  expect(
    blocking,
    `Violations a11y bloquantes${context ? ` sur ${context}` : ''} :\n` +
      blocking
        .map((v) => ` - ${v.id} [${v.impact}] ${v.help}\n   ${v.nodes.map((n) => n.target.join(' ')).join('\n   ')}`)
        .join('\n'),
  ).toEqual([]);
}
