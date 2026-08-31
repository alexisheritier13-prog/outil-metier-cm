import { expect, test } from '@playwright/test';
import { E2E_CLIENT_EMAIL, E2E_PASSWORD, checkA11y, login } from './helpers';

test.beforeEach(() =>
  test.skip(!E2E_CLIENT_EMAIL || !E2E_PASSWORD, 'E2E_CLIENT_EMAIL / E2E_PASSWORD non fournis'),
);

test('espace client : navigation accessible entre les onglets', async ({ page }) => {
  await login(page, E2E_CLIENT_EMAIL, E2E_PASSWORD);
  await expect(page).toHaveURL(/\/portail/);
  await checkA11y(page, 'portail · calendrier');

  await page.getByRole('link', { name: 'Publiés' }).click();
  await expect(page).toHaveURL(/\/portail\/publies/);
  await checkA11y(page, 'portail · publiés');

  await page.getByRole('link', { name: 'À valider' }).click();
  await expect(page).toHaveURL(/\/portail\/a-valider/);
  await checkA11y(page, 'portail · à valider');
});

test('espace client : ouvrir un post publié depuis le calendrier', async ({ page }) => {
  await login(page, E2E_CLIENT_EMAIL, E2E_PASSWORD);
  await page.getByRole('tab', { name: 'Liste' }).click();

  const firstRow = page.getByRole('button', { name: /ouvrir/i }).first();
  if (await firstRow.count()) {
    await firstRow.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await checkA11y(page, 'portail · détail post');
  }
});
