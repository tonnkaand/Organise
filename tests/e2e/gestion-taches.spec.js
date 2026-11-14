const { test, expect } = require('@playwright/test');

async function preparerUtilisateurAvecProjet(page) {
  const suffixe = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  await page.goto('/');
  await page.locator('#show-register').click();

  await page.locator('#register-name').fill('Utilisateur Tâches');
  await page.locator('#register-email').fill(`tache-${suffixe}@test.com`);
  await page.locator('#register-password').fill('MotDePasse123!');
  await page.locator('#register-form button[type="submit"]').click();

  await expect(page.locator('#app-shell')).toBeVisible({
    timeout: 15000,
  });

  await page.locator('#new-project-open').click();
  await page.locator('#project-name').fill(`Projet ${suffixe}`);
  await page.locator('#project-description').fill('Projet de test');
  await page.locator('#project-form button[type="submit"]').click();

  await expect(page.locator('#projects')).toContainText(`Projet ${suffixe}`);

  return `Tâche ${suffixe}`;
}

async function creerTache(page, titre) {
  await page.locator('#new-task-open').click();

  await expect(page.locator('#task-modal')).toBeVisible();

  await page.locator('#title').fill(titre);
  await page.locator('#description').fill('Description de test Playwright');

  await page.locator('#task-submit').click();

  await expect(page.locator('#task-modal')).toBeHidden();
  await expect(page.locator('#tasks')).toContainText(titre);
}

test('un utilisateur peut créer une tâche', async ({ page }) => {
  const titre = await preparerUtilisateurAvecProjet(page);

  await creerTache(page, titre);

  await expect(page.locator('[data-task-card]')).toHaveCount(1);
});

test('un utilisateur peut modifier une tâche', async ({ page }) => {
  const ancienTitre = await preparerUtilisateurAvecProjet(page);
  await creerTache(page, ancienTitre);

  const carte = page.locator('[data-task-card]');
  await carte.locator('[data-edit]').click();

  await expect(page.locator('#task-modal')).toBeVisible();

  const nouveauTitre = `Tâche modifiée ${Date.now()}`;
  await page.locator('#title').fill(nouveauTitre);
  await page.locator('#description').fill('Description modifiée');

  await page.locator('#task-submit').click();

  await expect(page.locator('#task-modal')).toBeHidden();
  await expect(page.locator('#tasks')).toContainText(nouveauTitre);
  await expect(page.locator('#tasks')).not.toContainText(ancienTitre);
});

test('un utilisateur peut marquer une tâche comme terminée', async ({ page }) => {
  const titre = await preparerUtilisateurAvecProjet(page);
  await creerTache(page, titre);

  const carte = page.locator('[data-task-card]');
  const checkbox = carte.locator('[data-complete]');

  await checkbox.check();

  await expect(checkbox).toBeChecked();
  await expect(carte).toHaveClass(/is-done/);
});

test('un utilisateur peut supprimer une tâche après confirmation', async ({ page }) => {
  const titre = await preparerUtilisateurAvecProjet(page);
  await creerTache(page, titre);

  page.once('dialog', dialog => dialog.accept());

  await page.locator('[data-task-card]').locator('[data-delete]').click();

  await expect(page.locator('[data-task-card]')).toHaveCount(0);
  await expect(page.locator('#tasks')).toContainText('Votre espace est prêt');
});

test('un utilisateur peut annuler la suppression d’une tâche', async ({ page }) => {
  const titre = await preparerUtilisateurAvecProjet(page);
  await creerTache(page, titre);

  page.once('dialog', dialog => dialog.dismiss());

  await page.locator('[data-task-card]').locator('[data-delete]').click();

  await expect(page.locator('[data-task-card]')).toHaveCount(1);
  await expect(page.locator('#tasks')).toContainText(titre);
});
