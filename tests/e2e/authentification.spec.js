const { test, expect } = require('@playwright/test');


// Créer un compte de test pour les scénarios d'authentification.
async function creerComptePourAuthentification(page) {
  const nom = 'Utilisateur Test';
  const email = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
  const motDePasse = 'MotDePasse123!';

  await page.goto('/');

  if (!(await page.locator('#register-form').isVisible())) {
    await page.locator('#show-register').click();
  }

  await page.locator('#register-name').fill(nom);
  await page.locator('#register-email').fill(email);
  await page.locator('#register-password').fill(motDePasse);
  await page.locator('#register-form button[type="submit"]').click();

  await expect(page.locator('#app-shell')).toBeVisible({
    timeout: 15000,
  });

  return { email, motDePasse };
}

test('un utilisateur inscrit peut se déconnecter', async ({ page }) => {
  await creerComptePourAuthentification(page);

  await page.locator('#logout-button').click();

  await expect(page.locator('#auth-view')).toBeVisible({
    timeout: 10000,
  });

  await expect(page.locator('#app-shell')).toBeHidden();
});

test('un utilisateur peut se reconnecter après sa déconnexion', async ({ page }) => {
  const compte = await creerComptePourAuthentification(page);

  await page.locator('#logout-button').click();

  await expect(page.locator('#auth-view')).toBeVisible({
    timeout: 10000,
  });

  await page.locator('#login-email').fill(compte.email);
  await page.locator('#login-password').fill(compte.motDePasse);
  await page.locator('#login-form button[type="submit"]').click();

  await expect(page.locator('#app-shell')).toBeVisible({
    timeout: 15000,
  });

  await expect(page.locator('#auth-view')).toBeHidden();
});
