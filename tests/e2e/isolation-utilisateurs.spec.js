const { test, expect } = require('@playwright/test');

async function creerCompte(browser, nom) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('/');
  await page.locator('#show-register').click();

  const suffixe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  await page.locator('#register-name').fill(nom);
  await page.locator('#register-email').fill(`${suffixe}@test.com`);
  await page.locator('#register-password').fill('MotDePasse123!');
  await page.locator('#register-form button[type="submit"]').click();

  await expect(page.locator('#app-shell')).toBeVisible({
    timeout: 15000,
  });

  return { context, page };
}

async function requeteApi(page, method, path, body) {
  return page.evaluate(async ({ method, path, body }) => {
    const headers = {};

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfResponse = await fetch('/api/auth/csrf');
      const csrfData = await csrfResponse.json();
      headers['X-XSRF-TOKEN'] = csrfData.token;
    }

    const response = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const data = response.status === 204
      ? null
      : await response.json().catch(() => null);

    return {
      status: response.status,
      data,
    };
  }, { method, path, body });
}

async function preparerDeuxUtilisateurs(browser) {
  const compteA = await creerCompte(browser, 'Utilisateur A');
  const compteB = await creerCompte(browser, 'Utilisateur B');

  const projetResponse = await requeteApi(
    compteA.page,
    'POST',
    '/api/projects',
    {
      name: 'Projet privé de A',
      description: 'Ce projet appartient uniquement au compte A',
    }
  );

  expect(projetResponse.status).toBe(201);

  const projetId = projetResponse.data.id;

  const tacheResponse = await requeteApi(
    compteA.page,
    'POST',
    '/api/tasks',
    {
      title: 'Tâche privée de A',
      description: 'Cette tâche appartient au compte A',
      projectId: projetId,
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: null,
    }
  );

  expect(tacheResponse.status).toBe(201);

  return {
    compteA,
    compteB,
    projetId,
    tacheId: tacheResponse.data.id,
  };
}

test('un utilisateur ne peut pas consulter les projets et tâches d’un autre', async ({ browser }) => {
  const { compteA, compteB, projetId, tacheId } =
    await preparerDeuxUtilisateurs(browser);

  try {
    const projets = await requeteApi(
      compteB.page, 'GET', '/api/projects'
    );

    const projet = await requeteApi(
      compteB.page, 'GET', `/api/projects/${projetId}`
    );

    const taches = await requeteApi(
      compteB.page, 'GET', '/api/tasks'
    );

    const tache = await requeteApi(
      compteB.page, 'GET', `/api/tasks/${tacheId}`
    );

    const tachesProjet = await requeteApi(
      compteB.page, 'GET', `/api/tasks/by-project/${projetId}`
    );

    expect(projets.status).toBe(200);
    expect(projets.data).toHaveLength(0);

    expect(projet.status).toBe(404);

    expect(taches.status).toBe(200);
    expect(taches.data).toHaveLength(0);

    expect(tache.status).toBe(404);
    expect(tachesProjet.status).toBe(404);
  } finally {
    await compteA.context.close();
    await compteB.context.close();
  }
});

test('un utilisateur ne peut pas modifier ou supprimer le projet d’un autre', async ({ browser }) => {
  const { compteA, compteB, projetId } =
    await preparerDeuxUtilisateurs(browser);

  try {
    const modification = await requeteApi(
      compteB.page,
      'PUT',
      `/api/projects/${projetId}`,
      {
        name: 'Projet piraté',
        description: 'Modification non autorisée',
      }
    );

    const suppression = await requeteApi(
      compteB.page,
      'DELETE',
      `/api/projects/${projetId}`
    );

    const verification = await requeteApi(
      compteA.page,
      'GET',
      `/api/projects/${projetId}`
    );

    expect(modification.status).toBe(404);
    expect(suppression.status).toBe(404);
    expect(verification.status).toBe(200);
    expect(verification.data.name).toBe('Projet privé de A');
  } finally {
    await compteA.context.close();
    await compteB.context.close();
  }
});

test('un utilisateur ne peut pas modifier ou supprimer la tâche d’un autre', async ({ browser }) => {
  const { compteA, compteB, projetId, tacheId } =
    await preparerDeuxUtilisateurs(browser);

  try {
    const modification = await requeteApi(
      compteB.page,
      'PUT',
      `/api/tasks/${tacheId}`,
      {
        title: 'Tâche piratée',
        description: 'Modification non autorisée',
        projectId: projetId,
        priority: 'HIGH',
        status: 'DONE',
        dueDate: null,
      }
    );

    const suppression = await requeteApi(
      compteB.page,
      'DELETE',
      `/api/tasks/${tacheId}`
    );

    const verification = await requeteApi(
      compteA.page,
      'GET',
      `/api/tasks/${tacheId}`
    );

    expect(modification.status).toBe(404);
    expect(suppression.status).toBe(404);
    expect(verification.status).toBe(200);
    expect(verification.data.title).toBe('Tâche privée de A');
    expect(verification.data.status).toBe('TODO');
  } finally {
    await compteA.context.close();
    await compteB.context.close();
  }
});

test('un utilisateur ne peut pas créer une tâche dans le projet d’un autre', async ({ browser }) => {
  const { compteA, compteB, projetId } =
    await preparerDeuxUtilisateurs(browser);

  try {
    const creation = await requeteApi(
      compteB.page,
      'POST',
      '/api/tasks',
      {
        title: 'Tâche non autorisée',
        description: 'Tentative dans un projet étranger',
        projectId: projetId,
        priority: 'MEDIUM',
        status: 'TODO',
        dueDate: null,
      }
    );

    const tachesA = await requeteApi(
      compteA.page,
      'GET',
      '/api/tasks'
    );

    expect(creation.status).toBe(404);
    expect(tachesA.status).toBe(200);
    expect(tachesA.data).toHaveLength(1);
    expect(tachesA.data[0].title).toBe('Tâche privée de A');
  } finally {
    await compteA.context.close();
    await compteB.context.close();
  }
});
