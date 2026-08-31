import { expect, test } from '@playwright/test';
import { checkA11y, login, requireCreds } from './helpers';

test.beforeEach(requireCreds);

test('file « À valider » : accessible, ouverture d’un post', async ({ page }) => {
  await login(page);
  await page.goto('/app/a-valider');

  await expect(page.getByRole('heading', { name: 'À valider' })).toBeVisible();
  await checkA11y(page, 'à valider');

  // Onglets interne / client opérables.
  await page.getByRole('tab', { name: /attente du client/i }).click();
  await expect(page.getByRole('tab', { name: /attente du client/i, selected: true })).toBeVisible();
});

test('ajout d’un commentaire sur un post', async ({ page }) => {
  await login(page);
  await page.goto('/app/planning');
  await page.getByRole('tab', { name: 'Liste' }).click();
  await page.getByRole('button', { name: /Ouvrir le post/i }).first().click();

  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();

  const field = panel.getByPlaceholder(/commentaire/i);
  const note = `Test E2E ${Date.now()}`;
  await field.fill(note);
  await panel.getByRole('button', { name: /envoyer|ajouter|commenter/i }).click();
  await expect(panel.getByText(note)).toBeVisible();
});
