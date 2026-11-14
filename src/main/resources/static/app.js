
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const API = '/api';

  const labels = {
    TODO: 'À faire',
    IN_PROGRESS: 'En cours',
    DONE: 'Terminée',
    LOW: 'Basse',
    MEDIUM: 'Moyenne',
    HIGH: 'Urgente'
  };

  let db = null;
  let currentUser = null;
  let csrfToken = null;
  let projects = [];
  let tasks = [];
  let selectedProject = null;
  let currentView = 'all';

  const today = () => new Date().toLocaleDateString('sv-SE');

  // --------------------------------------------------
  // 1. COMMUNICATION AVEC L'API ET PROTECTION CSRF
  // --------------------------------------------------

  async function fetchCsrfToken() {
    const response = await fetch(`${API}/auth/csrf`, {
      method: 'GET',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error('Impossible de préparer la connexion sécurisée.');
    }

    const data = await response.json();
    csrfToken = data.token;
  }

  async function api(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});

    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
      if (!csrfToken) {
        await fetchCsrfToken();
      }
      headers.set('X-XSRF-TOKEN', csrfToken);
    }

    const response = await fetch(API + path, {
      ...options,
      method,
      headers,
      credentials: 'same-origin'
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(
        body.error || `La requête a échoué (${response.status}).`
      );
      error.status = response.status;
      throw error;
    }

    return response.status === 204 ? null : response.json();
  }

  // --------------------------------------------------
  // 2. GESTION DE L'AFFICHAGE DE L'AUTHENTIFICATION
  // --------------------------------------------------

  function showAuth(mode = 'login', message = '') {
    $('auth-view').hidden = false;
    $('app-shell').hidden = true;

    const registering = mode === 'register';

    $('login-form').hidden = registering;
    $('register-form').hidden = !registering;

    $('auth-title').textContent = registering
      ? 'Créer votre compte'
      : 'Bienvenue sur Organise';

    $('auth-description').textContent = registering
      ? 'Créez votre espace personnel pour organiser vos tâches.'
      : 'Connectez-vous pour retrouver votre organisation.';

    $('login-error').textContent = '';
    $('register-error').textContent = '';

    if (message) {
      $(registering ? 'register-error' : 'login-error').textContent = message;
    }
  }

  function showApp() {
    $('auth-view').hidden = true;
    $('app-shell').hidden = false;
    $('user-name').textContent = currentUser?.name || '';
  }

  $('show-register').addEventListener('click', () => {
    showAuth('register');
    $('register-name').focus();
  });

  $('show-login').addEventListener('click', () => {
    showAuth('login');
    $('login-email').focus();
  });

  // --------------------------------------------------
  // 3. CONNEXION ET INSCRIPTION
  // --------------------------------------------------

  async function establishSession() {
    // Le serveur confirme l'identité avant tout accès aux données privées.
    await fetchCsrfToken();
    const user = await api('/auth/me');
    await activateUser(user);
  }

  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('login-error').textContent = '';

    const email = $('login-email').value.trim();
    const password = $('login-password').value;

    const submit = $('login-form').querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Connexion…';

    try {
      await fetchCsrfToken();

      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // Récupération d'un nouveau jeton après authentification.
      await establishSession();

      $('login-form').reset();
      toast('Connexion réussie. Bienvenue !');
    } catch (error) {
      showAuth('login', error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Se connecter';
    }
  });

  $('register-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('register-error').textContent = '';

    const name = $('register-name').value.trim();
    const email = $('register-email').value.trim();
    const password = $('register-password').value;

    const submit = $('register-form').querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Création du compte…';

    try {
      await fetchCsrfToken();

      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });

      // Après l'inscription, on ouvre automatiquement la session.
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      await establishSession();

      $('register-form').reset();
      toast('Votre compte a été créé avec succès !');
    } catch (error) {
      showAuth('register', error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Créer mon compte';
    }
  });

  // --------------------------------------------------
  // 4. CACHE INDEXEDDB INDIVIDUEL PAR UTILISATEUR
  // --------------------------------------------------

  function openDB(userId) {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB n’est pas disponible dans ce navigateur.'));
        return;
      }

      // Chaque compte possède sa propre base locale.
      const request = indexedDB.open(`organise-local-user-${userId}`, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains('projects')) {
          database.createObjectStore('projects', { keyPath: 'id' });
        }

        if (!database.objectStoreNames.contains('tasks')) {
          database.createObjectStore('tasks', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function cache(store, rows) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Aucun cache utilisateur ouvert.'));
        return;
      }

      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);

      objectStore.clear();
      rows.forEach(row => objectStore.put(row));

      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  function readCache(store) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Aucun cache utilisateur ouvert.'));
        return;
      }

      const tx = db.transaction(store, 'readonly');
      const request = tx.objectStore(store).getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --------------------------------------------------
  // 5. ACTIVATION DE L'ESPACE D'UN UTILISATEUR
  // --------------------------------------------------

  async function activateUser(user) {
    if (!user || !user.id) {
      throw new Error('Le serveur n’a pas confirmé votre identité.');
    }

    if (db) {
      db.close();
      db = null;
    }

    currentUser = user;
    projects = [];
    tasks = [];
    selectedProject = null;
    currentView = 'all';

    showApp();

    try {
      db = await openDB(user.id);
    } catch (error) {
      console.warn('Cache local indisponible :', error);
      db = null;
    }

    await refresh();
  }

  // --------------------------------------------------
  // 6. DÉCONNEXION
  // --------------------------------------------------

  $('logout-button').addEventListener('click', async () => {
    const button = $('logout-button');
    button.disabled = true;

    try {
      await api('/auth/logout', { method: 'POST' });

      if (db) {
        db.close();
        db = null;
      }

      currentUser = null;
      projects = [];
      tasks = [];
      selectedProject = null;
      currentView = 'all';

      showAuth('login');
      await fetchCsrfToken();

      toast('Vous êtes déconnecté.');
    } catch (error) {
      toast(error.message || 'Impossible de vous déconnecter.', true);
    } finally {
      button.disabled = false;
    }
  });

  // --------------------------------------------------
  // 7. AFFICHAGE DES NOTIFICATIONS
  // --------------------------------------------------

  function toast(message, error = false) {
    const node = document.createElement('div');
    node.className = `toast${error ? ' error' : ''}`;
    node.textContent = message;

    $('toast-region').append(node);
    window.setTimeout(() => node.remove(), 3500);
  }

  function setConnection(online, message) {
    $('connection').textContent = message;
    $('connection-dot').classList.toggle('online', online);
    $('sync-label').textContent = online
      ? 'Synchronisation active'
      : 'Serveur indisponible';
  }

  // --------------------------------------------------
  // 8. CHARGEMENT ET SYNCHRONISATION DES DONNÉES
  // --------------------------------------------------

  async function refresh() {
    if (!currentUser) {
      return;
    }

    try {
      const [nextProjects, nextTasks] = await Promise.all([
        api('/projects'),
        api('/tasks')
      ]);

      projects = nextProjects;
      tasks = nextTasks;

      if (db) {
        await Promise.all([
          cache('projects', projects),
          cache('tasks', tasks)
        ]);
      }

      setConnection(true, 'API connectée · cache à jour');
      render();

    } catch (error) {
      // Une session expirée ne doit jamais afficher le cache privé.
      if (error.status === 401) {
        if (db) {
          db.close();
          db = null;
        }

        currentUser = null;
        projects = [];
        tasks = [];

        showAuth('login', 'Votre session a expiré. Veuillez vous reconnecter.');
        return;
      }

      // Le cache n'est utilisé que pour le compte déjà authentifié.
      setConnection(false, 'API indisponible · cache local');

      if (db) {
        try {
          [projects, tasks] = await Promise.all([
            readCache('projects'),
            readCache('tasks')
          ]);
          render();
        } catch (cacheError) {
          console.error('Erreur du cache local :', cacheError);
        }
      } else {
        render();
      }

      console.error('Erreur de synchronisation :', error);
      toast('Serveur indisponible. Vérifiez votre connexion.', true);
    }
  }

  // --------------------------------------------------
  // 9. FONCTIONS D'AFFICHAGE DES PROJETS ET TÂCHES
  // --------------------------------------------------

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function projectName(id) {
    return projects.find(project => project.id === id)?.name
      || 'Projet inconnu';
  }

  function visibleTasks() {
    const query = $('search').value.trim().toLocaleLowerCase('fr');

    let result = tasks.filter(task =>
      selectedProject === null || task.projectId === selectedProject
    );

    if ($('filter').value) {
      result = result.filter(task => task.status === $('filter').value);
    }

    if (currentView === 'today') {
      result = result.filter(task =>
        task.dueDate === today() && task.status !== 'DONE'
      );
    }

    if (currentView === 'late') {
      result = result.filter(task => task.overdue);
    }

    if (query) {
      result = result.filter(task =>
        `${task.title} ${task.description || ''} ${projectName(task.projectId)}`
          .toLocaleLowerCase('fr')
          .includes(query)
      );
    }

    const sort = $('sort').value;

    result.sort((a, b) => {
      if (sort === 'priority') {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return order[a.priority] - order[b.priority];
      }

      if (sort === 'newest') return b.id - a.id;
      if (sort === 'title') return a.title.localeCompare(b.title, 'fr');

      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    });

    return result;
  }

  function renderProjects() {
    $('projects').innerHTML = projects.map(project => `
      <div class="project-row">
        <button class="project-link${selectedProject === project.id ? ' active' : ''}"
                data-project="${project.id}">
          <span class="project-bullet"></span>
          <span class="project-name">${escapeHTML(project.name)}</span>
          <span class="project-number">
            ${tasks.filter(task => task.projectId === project.id).length}
          </span>
        </button>

        <span class="project-tools">
          <button class="project-tool"
                  data-project-edit="${project.id}"
                  aria-label="Modifier ${escapeHTML(project.name)}"
                  title="Modifier le projet">✎</button>

          <button class="project-tool"
                  data-project-delete="${project.id}"
                  aria-label="Supprimer ${escapeHTML(project.name)}"
                  title="Supprimer le projet">×</button>
        </span>
      </div>
    `).join('') || '<p class="empty-projects">Aucun projet pour le moment</p>';

    $('project').innerHTML = projects.map(project => `
      <option value="${project.id}">${escapeHTML(project.name)}</option>
    `).join('');

    if (
      selectedProject !== null &&
      !projects.some(project => project.id === selectedProject)
    ) {
      selectedProject = null;
    }
  }

  function renderStats() {
    const done = tasks.filter(task => task.status === 'DONE').length;

    $('stat-total').textContent = tasks.length;
    $('stat-progress').textContent =
      tasks.filter(task => task.status === 'IN_PROGRESS').length;
    $('stat-done').textContent = done;
    $('stat-late').textContent =
      tasks.filter(task => task.overdue).length;

    $('all-count').textContent = tasks.length;
    $('late-count').textContent =
      tasks.filter(task => task.overdue).length;
  }

  function renderTasks() {
    const list = visibleTasks();

    $('tasks').innerHTML = list.map(task => {
      const priorityClass = `priority-${task.priority.toLowerCase()}`;

      const date = task.dueDate
        ? `<span class="pill${task.overdue ? ' overdue' : ''}">
            ${task.overdue ? '⚑ En retard · ' : '◷ Échéance · '}
            ${escapeHTML(task.dueDate)}
          </span>`
        : '';

      return `
        <article class="task-card${task.status === 'DONE' ? ' is-done' : ''}"
                 data-task-card="${task.id}">

          <div class="task-card-top">
            <input class="task-check"
                   type="checkbox"
                   data-complete="${task.id}"
                   aria-label="Marquer ${escapeHTML(task.title)} comme terminée"
                   ${task.status === 'DONE' ? 'checked' : ''}>

            <div class="task-main">
              <div class="task-title">${escapeHTML(task.title)}</div>

              ${task.description
                ? `<p class="task-description">${escapeHTML(task.description)}</p>`
                : ''}

              <div class="task-meta">
                <span class="pill ${priorityClass}">
                  ${labels[task.priority]}
                </span>

                <span class="pill${task.status === 'DONE' ? ' status-done' : ''}">
                  ${labels[task.status]}
                </span>

                ${date}
              </div>
            </div>
          </div>

          <div class="task-footer">
            <span class="task-project">
              ↳ ${escapeHTML(projectName(task.projectId))}
            </span>

            <div class="task-actions">
              <button class="text-button" data-edit="${task.id}">
                Modifier
              </button>

              <button class="text-button danger" data-delete="${task.id}">
                Supprimer
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('') || `
      <div class="empty-state">
        <div class="empty-icon">✳</div>
        <h3>${tasks.length ? 'Aucune tâche correspondante' : 'Votre espace est prêt'}</h3>
        <p>
          ${tasks.length
            ? 'Essayez de modifier vos filtres ou votre recherche.'
            : 'Créez un projet, puis ajoutez votre première tâche.'}
        </p>
        ${tasks.length
          ? ''
          : '<button class="primary-button" id="empty-new-task">＋ Créer une tâche</button>'}
      </div>
    `;
  }

  function render() {
    renderProjects();
    renderStats();
    renderTasks();

    const selected = projects.find(project => project.id === selectedProject);

    $('page-title').textContent = selected
      ? selected.name
      : ({
          today: "À échéance aujourd'hui",
          late: 'Tâches en retard'
        }[currentView] || 'Toutes les tâches');

    $('list-title').textContent = selected
      ? `Tâches · ${selected.name}`
      : 'Votre organisation';

    $('list-subtitle').textContent =
      `${visibleTasks().length} tâche(s) affichée(s)`;

    document.querySelectorAll('[data-view]').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.view === currentView && selectedProject === null
      );
    });
  }

  // --------------------------------------------------
  // 10. GESTION DES MODALES
  // --------------------------------------------------

  function openTask(task = null) {
    if (!projects.length) {
      toast('Créez d’abord un projet pour pouvoir ajouter une tâche.', true);
      $('project-modal').showModal();
      return;
    }

    $('task-form').reset();
    $('task-error').textContent = '';
    $('task-id').value = task?.id || '';

    $('task-modal-title').textContent =
      task ? 'Modifier la tâche' : 'Créer une tâche';

    $('task-submit').textContent =
      task ? 'Enregistrer les modifications' : 'Créer la tâche';

    $('title').value = task?.title || '';
    $('description').value = task?.description || '';
    $('project').value = String(
      task?.projectId ?? selectedProject ?? projects[0].id
    );

    $('priority').value = task?.priority || 'MEDIUM';
    $('status').value = task?.status || 'TODO';
    $('due').value = task?.dueDate || '';

    $('task-modal').showModal();
    $('title').focus();
  }

  function openProject(project = null) {
    $('project-form').reset();
    $('project-error').textContent = '';
    $('project-id').value = project?.id || '';

    $('project-modal-title').textContent =
      project ? 'Modifier le projet' : 'Nouveau projet';

    $('project-name').value = project?.name || '';
    $('project-description').value = project?.description || '';

    $('project-form').querySelector('[type=submit]').textContent =
      project ? 'Enregistrer' : 'Créer le projet';

    $('project-modal').showModal();
    $('project-name').focus();
  }

  $('new-task-open').addEventListener('click', () => openTask());
  $('new-project-open').addEventListener('click', () => openProject());

  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => {
      $(button.dataset.close).close();
    });
  });

  // --------------------------------------------------
  // 11. CRÉATION ET MODIFICATION DES TÂCHES
  // --------------------------------------------------

  $('task-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('task-error').textContent = '';

    const id = $('task-id').value;

    const payload = {
      title: $('title').value.trim(),
      description: $('description').value.trim(),
      projectId: Number($('project').value),
      priority: $('priority').value,
      status: $('status').value,
      dueDate: $('due').value || null
    };

    try {
      await api(id ? `/tasks/${id}` : '/tasks', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      $('task-modal').close();
      await refresh();
      toast(id ? 'Tâche mise à jour.' : 'Tâche créée.');

    } catch (error) {
      $('task-error').textContent = error.message;
    }
  });

  // --------------------------------------------------
  // 12. CRÉATION ET MODIFICATION DES PROJETS
  // --------------------------------------------------

  $('project-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('project-error').textContent = '';

    try {
      const id = $('project-id').value;

      const project = await api(
        id ? `/projects/${id}` : '/projects',
        {
          method: id ? 'PUT' : 'POST',
          body: JSON.stringify({
            name: $('project-name').value.trim(),
            description: $('project-description').value.trim()
          })
        }
      );

      $('project-modal').close();
      await refresh();

      if (!id) {
        selectedProject = project.id;
      }

      render();
      toast(id ? 'Projet modifié.' : 'Projet créé.');

    } catch (error) {
      $('project-error').textContent = error.message;
    }
  });

  // --------------------------------------------------
  // 13. ACTIONS SUR LES PROJETS
  // --------------------------------------------------

  $('projects').addEventListener('click', async event => {
    const edit = event.target.closest('[data-project-edit]');
    const del = event.target.closest('[data-project-delete]');
    const button = event.target.closest('[data-project]');

    if (edit) {
      const project = projects.find(
        item => item.id === Number(edit.dataset.projectEdit)
      );

      if (project) openProject(project);
      return;
    }

    if (del) {
      const project = projects.find(
        item => item.id === Number(del.dataset.projectDelete)
      );

      if (
        !project ||
        !window.confirm(`Supprimer le projet « ${project.name} » ?`)
      ) {
        return;
      }

      try {
        await api(`/projects/${project.id}`, { method: 'DELETE' });

        if (selectedProject === project.id) {
          selectedProject = null;
        }

        await refresh();
        toast('Projet supprimé.');

      } catch (error) {
        toast(error.message, true);
      }

      return;
    }

    if (button) {
      selectedProject = Number(button.dataset.project);
      currentView = 'all';
      render();
    }
  });

  // --------------------------------------------------
  // 14. NAVIGATION, FILTRES ET RECHERCHE
  // --------------------------------------------------

  document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view;
      selectedProject = null;
      render();
    });
  });

  $('filter').addEventListener('change', render);
  $('sort').addEventListener('change', render);
  $('search').addEventListener('input', render);

  // --------------------------------------------------
  // 15. ACTIONS SUR LES TÂCHES
  // --------------------------------------------------

  $('tasks').addEventListener('click', async event => {
    if (event.target.id === 'empty-new-task') {
      return openTask();
    }

    const edit = event.target.closest('[data-edit]');
    const del = event.target.closest('[data-delete]');

    if (edit) {
      const task = tasks.find(
        item => item.id === Number(edit.dataset.edit)
      );

      if (task) openTask(task);
    }

    if (del) {
      const id = Number(del.dataset.delete);
      const task = tasks.find(item => item.id === id);

      if (
        !task ||
        !window.confirm(`Supprimer la tâche « ${task.title} » ?`)
      ) {
        return;
      }

      try {
        await api(`/tasks/${id}`, { method: 'DELETE' });
        await refresh();
        toast('Tâche supprimée.');

      } catch (error) {
        toast(error.message, true);
      }
    }
  });

  $('tasks').addEventListener('change', async event => {
    const checkbox = event.target.closest('[data-complete]');

    if (!checkbox) return;

    const task = tasks.find(
      item => item.id === Number(checkbox.dataset.complete)
    );

    if (!task) return;

    const wasChecked = checkbox.checked;

    const payload = {
      title: task.title,
      description: task.description,
      projectId: task.projectId,
      priority: task.priority,
      status: wasChecked ? 'DONE' : 'TODO',
      dueDate: task.dueDate
    };

    try {
      await api(`/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      await refresh();

      toast(
        wasChecked ? 'Tâche terminée. Bravo !' : 'Tâche rouverte.'
      );

    } catch (error) {
      checkbox.checked = !wasChecked;
      toast(error.message, true);
    }
  });

  // --------------------------------------------------
  // 16. INITIALISATION DE L'APPLICATION
  // --------------------------------------------------

  $('date-label').textContent = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date()).toLocaleUpperCase('fr');

  async function initialize() {
    showAuth('login');

    try {
      await establishSession();

    } catch (error) {
      if (error.status === 401) {
        showAuth('login');
      } else {
        showAuth(
          'login',
          'Impossible de vérifier votre session. Vérifiez que le serveur est démarré, puis réessayez.'
        );
        console.error('Initialisation impossible :', error);
      }
    }
  }

  window.addEventListener('online', () => {
    if (currentUser) {
      refresh();
    }
  });

  initialize();

})();
