const { test, expect } = require('@playwright/test');

test('un utilisateur peut créer un projet', async ({ page }) => {
  const nom = 'Utilisateur Projet';
  const email = `projet-${Date.now()}@test.com`;
  const motDePasse = 'MotDePasse123!';
  const nomProjet = `Projet Test ${Date.now()}`;

  // Créer un utilisateur et se connecter automatiquement.
  await page.goto('/');
  await page.locator('#show-register').click();

  await page.locator('#register-name').fill(nom);
  await page.locator('#register-email').fill(email);
  await page.locator('#register-password').fill(motDePasse);
  await page.locator('#register-form button[type="submit"]').click();

  await expect(page.locator('#app-shell')).toBeVisible({
    timeout: 15000,
  });

  // Ouvrir le formulaire de création de projet.
  await page.locator('#new-project-open').click();

  await expect(page.locator('#project-modal')).toBeVisible();

  // Renseigner le projet.
  await page.locator('#project-name').fill(nomProjet);
  await page.locator('#project-description').fill(
    'Projet créé automatiquement avec Playwright.'
  );

  await page.locator('#project-form button[type="submit"]').click();

  // Vérifier que le projet apparaît dans l'espace utilisateur.
  await expect(page.locator('#project-modal')).toBeHidden({
    timeout: 10000,
  });

  await expect(page.locator('#projects')).toContainText(nomProjet, {
    timeout: 10000,
  });
});
