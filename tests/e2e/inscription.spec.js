const { test, expect } = require('@playwright/test');

test('un nouvel utilisateur peut créer un compte et accéder à son espace', async ({ page }) => {
  const nom = 'Utilisateur Test';
  const email = `test-${Date.now()}@example.com`;
  const motDePasse = 'Test1234!';

  await page.goto('/');

  // Ouvrir le formulaire d'inscription.
  await page.locator('#show-register').click();

  await expect(page.locator('#register-form')).toBeVisible();

  // Remplir et envoyer le formulaire.
  await page.locator('#register-name').fill(nom);
  await page.locator('#register-email').fill(email);
  await page.locator('#register-password').fill(motDePasse);
  await page.locator('#register-form button[type="submit"]').click();

  // Vérifier que l'utilisateur accède à son espace.
  await expect(page.locator('#app-shell')).toBeVisible({
    timeout: 15000,
  });

  await expect(page.locator('#auth-view')).toBeHidden();
  await expect(page.locator('#user-name')).toContainText(nom);
});
