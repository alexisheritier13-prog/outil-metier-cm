import { expect, test } from '@playwright/test';
import { checkA11y, login, requireCreds } from './helpers';

test.beforeEach(requireCreds);

test('connexion : formulaire accessible, redirection vers /app', async ({ page }) => {
  await page.goto('/login');
  await checkA11y(page, 'login');

  await login(page);
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('identifiants invalides : message d’erreur', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/e-?mail/i).fill('inconnu@example.test');
  await page.getByLabel(/mot de passe/i).fill('mauvais-mot-de-passe');
  await page.getByRole('button', { name: /se connecter|connexion/i }).click();
  await expect(page.getByText(/identifiants|incorrect|invalide/i)).toBeVisible();
});
