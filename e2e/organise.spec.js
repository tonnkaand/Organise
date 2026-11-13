const { test, expect } = require('@playwright/test');

const unique = prefix => `${prefix} ${Date.now()}`;

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Toutes les tâches' })).toBeVisible();
  await expect(page.locator('#connection')).toContainText('API connectée');
});

test('crée un projet et le rend visible dans la navigation', async ({ page }) => {
  const projectName = unique('Projet test');

  await page.getByRole('button', { name: 'Ajouter un projet' }).click();
  await page.getByLabel('Nom du projet').fill(projectName);
  await page.getByRole('button', { name: 'Créer le projet' }).click();

  await expect(
    page.locator('.project-link').filter({ hasText: projectName })
  ).toBeVisible();
});

test('crée, modifie, termine, filtre et supprime une tâche', async ({ page }) => {
  const projectName = unique('Projet E2E');

  await page.getByRole('button', { name: 'Ajouter un projet' }).click();
  await page.getByLabel('Nom du projet').fill(projectName);
  await page.getByRole('button', { name: 'Créer le projet' }).click();

  await expect(
    page.locator('.project-link').filter({ hasText: projectName })
  ).toBeVisible();

  const title = unique('Tâche navigateur');

  await page.getByRole('button', { name: /Nouvelle tâche/ }).click();
  await page.getByLabel(/Titre de la tâche/).fill(title);

  await page.locator('#task-form')
    .getByLabel('Projet *', { exact: true })
    .selectOption({ label: projectName });

  await page.getByLabel('Priorité').selectOption('HIGH');
  await page.getByLabel("Date d'échéance").fill('2099-12-31');
  await page.getByRole('button', { name: 'Créer la tâche' }).click();

  const card = page.locator('.task-card').filter({ hasText: title });

  await expect(card).toBeVisible();
  await expect(card.getByText('Urgente')).toBeVisible();

  await card.getByRole('button', { name: 'Modifier' }).click();
  await page.getByLabel(/Titre de la tâche/).fill(`${title} modifiée`);
  await page.locator('#task-form')
    .getByLabel('Statut', { exact: true })
    .selectOption('IN_PROGRESS'); 
  await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();

  const updated = page.locator('.task-card').filter({
    hasText: `${title} modifiée`
  });

  await expect(updated).toBeVisible();
  await expect(updated.getByText('En cours')).toBeVisible();

  await updated.locator('[data-complete]').check();
  await expect(updated.getByText('Terminée')).toBeVisible();

  await page.getByLabel('Filtrer par statut').selectOption('DONE');
  await expect(
    page.locator('.task-card').filter({ hasText: `${title} modifiée` })
  ).toBeVisible();

  await page.getByLabel('Filtrer par statut').selectOption('');

  page.once('dialog', dialog => dialog.accept());
  await updated.getByRole('button', { name: 'Supprimer' }).click();

  await expect(
    page.locator('.task-card').filter({ hasText: `${title} modifiée` })
  ).toHaveCount(0);
});

test('met en cache les projets et les tâches dans IndexedDB après synchronisation API', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('organise-local', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const read = store => new Promise((resolve, reject) => {
      const request = db.transaction(store, 'readonly')
        .objectStore(store)
        .getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return {
      projects: await read('projects'),
      tasks: await read('tasks')
    };
  });

  expect(result.projects.length).toBeGreaterThan(0);
  expect(Array.isArray(result.tasks)).toBeTruthy();
});

test('modifie et supprime un projet vide', async ({ page }) => {
  const originalName = unique('Projet à modifier');
  const updatedName = `${originalName} renommé`;

  await page.getByRole('button', { name: 'Ajouter un projet' }).click();
  await page.getByLabel('Nom du projet').fill(originalName);
  await page.getByRole('button', { name: 'Créer le projet' }).click();

  await expect(
    page.locator('.project-link').filter({ hasText: originalName })
  ).toBeVisible();

  await page.getByRole('button', { name: `Modifier ${originalName}` }).click();
  await page.getByLabel('Nom du projet').fill(updatedName);
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(
    page.locator('.project-link').filter({ hasText: updatedName })
  ).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: `Supprimer ${updatedName}` }).click();

  await expect(
    page.locator('.project-link').filter({ hasText: updatedName })
  ).toHaveCount(0);
});

test('identifie une tâche dont la date est dépassée', async ({ page }) => {
  const projectName = unique('Projet retard');

  await page.getByRole('button', { name: 'Ajouter un projet' }).click();
  await page.getByLabel('Nom du projet').fill(projectName);
  await page.getByRole('button', { name: 'Créer le projet' }).click();

  const title = unique('Tâche en retard');
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  await page.getByRole('button', { name: /Nouvelle tâche/ }).click();
  await page.getByLabel(/Titre de la tâche/).fill(title);

  await page.locator('#task-form')
    .getByLabel('Projet *', { exact: true })
    .selectOption({ label: projectName });

  await page.getByLabel("Date d'échéance").fill(yesterday);
  await page.getByRole('button', { name: 'Créer la tâche' }).click();

  const card = page.locator('.task-card').filter({ hasText: title });

  await expect(card.getByText(/En retard/)).toBeVisible();

  await page.getByRole('button', { name: /En retard/ }).first().click();

  await expect(
    page.locator('.task-card').filter({ hasText: title })
  ).toBeVisible();
});
