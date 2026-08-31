import { expect, test } from '@playwright/test';
import { checkA11y, login, requireCreds } from './helpers';

test.beforeEach(requireCreds);

test('planning : navigation au clavier + bascule de vues + audit axe', async ({ page }) => {
  await login(page);
  await page.goto('/app/planning');

  // La barre de vues est atteignable et opérable au clavier.
  const monthTab = page.getByRole('tab', { name: 'Mois' });
  await expect(monthTab).toBeVisible();
  await page.getByRole('tab', { name: 'Liste' }).click();
  await expect(page.getByRole('tab', { name: 'Liste', selected: true })).toBeVisible();

  await checkA11y(page, 'planning · liste');

  await page.getByRole('tab', { name: 'Mois' }).click();
  await expect(page.getByRole('tab', { name: 'Mois', selected: true })).toBeVisible();
  await checkA11y(page, 'planning · mois');
});

test('ouverture d’un post : le panneau prend le focus et se ferme à Échap', async ({ page }) => {
  await login(page);
  await page.goto('/app/planning');
  await page.getByRole('tab', { name: 'Liste' }).click();

  const firstRow = page.getByRole('button', { name: /Ouvrir le post/i }).first();
  await firstRow.click();

  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  await checkA11y(page, 'panneau post');

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});
