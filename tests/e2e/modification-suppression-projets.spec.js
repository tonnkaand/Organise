const { test, expect } = require('@playwright/test');

async function creerUtilisateurEtProjet(page) {
  const email = `projet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.com`;
  const nomProjet = `Projet ${Date.now()}`;

  await page.goto('/');
  await page.locator('#show-register').click();

  await page.locator('#register-name').fill('Utilisateur Test');
  await page.locator('#register-email').fill(email);
  await page.locator('#register-password').fill('MotDePasse123!');
  await page.locator('#register-form button[type="submit"]').click();

  await expect(page.locator('#app-shell')).toBeVisible({
    timeout: 15000,
  });

  await page.locator('#new-project-open').click();
  await page.locator('#project-name').fill(nomProjet);
  await page.locator('#project-description').fill('Description initiale');
  await page.locator('#project-form button[type="submit"]').click();

  await expect(page.locator('#projects')).toContainText(nomProjet);

  return nomProjet;
}

test('un utilisateur peut modifier un projet', async ({ page }) => {
  const ancienNom = await creerUtilisateurEtProjet(page);
  const nouveauNom = `Projet modifié ${Date.now()}`;

  await page.locator('#projects').locator(
    `[data-project-edit]`
  ).click();

  await expect(page.locator('#project-modal')).toBeVisible();

  await page.locator('#project-name').fill(nouveauNom);
  await page.locator('#project-description').fill('Nouvelle description');

  await page.locator('#project-form button[type="submit"]').click();

  await expect(page.locator('#project-modal')).toBeHidden();
  await expect(page.locator('#projects')).toContainText(nouveauNom);
  await expect(page.locator('#projects')).not.toContainText(ancienNom);
});

test('un utilisateur peut supprimer un projet après confirmation', async ({ page }) => {
  const nomProjet = await creerUtilisateurEtProjet(page);

  page.once('dialog', dialog => dialog.accept());

  await page.locator('#projects').locator(
    '[data-project-delete]'
  ).click();

  await expect(page.locator('#projects')).not.toContainText(nomProjet);
  await expect(page.locator('#projects')).toContainText(
    'Aucun projet pour le moment'
  );
});

test('un utilisateur peut annuler la suppression d’un projet', async ({ page }) => {
  const nomProjet = await creerUtilisateurEtProjet(page);

  page.once('dialog', dialog => dialog.dismiss());

  await page.locator('#projects').locator(
    '[data-project-delete]'
  ).click();

  await expect(page.locator('#projects')).toContainText(nomProjet);
});
