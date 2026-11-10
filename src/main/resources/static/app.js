(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const API = '/api';
  const labels = {TODO:'À faire', IN_PROGRESS:'En cours', DONE:'Terminée', LOW:'Basse', MEDIUM:'Moyenne', HIGH:'Urgente'};
  let db, projects = [], tasks = [], selectedProject = null, currentView = 'all';
  const today = () => new Date().toLocaleDateString('sv-SE');

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB n’est pas disponible dans ce navigateur.'));
      const request = indexedDB.open('organise-local', 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('projects')) database.createObjectStore('projects', {keyPath:'id'});
        if (!database.objectStoreNames.contains('tasks')) database.createObjectStore('tasks', {keyPath:'id'});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function cache(store, rows) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);
      objectStore.clear(); rows.forEach(row => objectStore.put(row));
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
  }
  function readCache(store) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly'); const request = tx.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
  }
  async function api(path, options = {}) {
    const response = await fetch(API + path, {headers:{'Content-Type':'application/json', ...(options.headers || {})}, ...options});
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `La requête a échoué (${response.status}).`);
    }
    return response.status === 204 ? null : response.json();
  }
  function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function toast(message, error = false) {
    const node = document.createElement('div'); node.className = `toast${error ? ' error' : ''}`; node.textContent = message;
    $('toast-region').append(node); window.setTimeout(() => node.remove(), 3500);
  }
  function setConnection(online, message) {
    $('connection').textContent = message; $('connection-dot').classList.toggle('online', online);
    $('sync-label').textContent = online ? 'Synchronisation active' : 'Serveur indisponible';
  }
  async function refresh() {
    try {
      const [nextProjects, nextTasks] = await Promise.all([api('/projects'), api('/tasks')]);
      projects = nextProjects; tasks = nextTasks;
      await Promise.all([cache('projects', projects), cache('tasks', tasks)]);
      setConnection(true, 'API connectée · cache à jour'); render();
    } catch (error) {
      setConnection(false, 'API indisponible · cache local');
      if (db) {
        try { [projects, tasks] = await Promise.all([readCache('projects'), readCache('tasks')]); render(); }
        catch (cacheError) { console.error(cacheError); }
      }
      throw error;
    }
  }
  function projectName(id) { return projects.find(project => project.id === id)?.name || 'Projet inconnu'; }
  function visibleTasks() {
    const query = $('search').value.trim().toLocaleLowerCase('fr');
    let result = tasks.filter(task => selectedProject === null || task.projectId === selectedProject);
    if ($('filter').value) result = result.filter(task => task.status === $('filter').value);
    if (currentView === 'today') result = result.filter(task => task.dueDate === today() && task.status !== 'DONE');
    if (currentView === 'late') result = result.filter(task => task.overdue);
    if (query) result = result.filter(task => `${task.title} ${task.description || ''} ${projectName(task.projectId)}`.toLocaleLowerCase('fr').includes(query));
    const sort = $('sort').value;
    result.sort((a,b) => sort === 'priority' ? ({HIGH:0,MEDIUM:1,LOW:2}[a.priority]-({HIGH:0,MEDIUM:1,LOW:2}[b.priority])) : sort === 'newest' ? b.id-a.id : sort === 'title' ? a.title.localeCompare(b.title,'fr') : (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
    return result;
  }
  function renderProjects() {
    $('projects').innerHTML = projects.map(project => `<div class="project-row"><button class="project-link${selectedProject === project.id ? ' active' : ''}" data-project="${project.id}"><span class="project-bullet"></span><span class="project-name">${escapeHTML(project.name)}</span><span class="project-number">${tasks.filter(task => task.projectId === project.id).length}</span></button><span class="project-tools"><button class="project-tool" data-project-edit="${project.id}" aria-label="Modifier ${escapeHTML(project.name)}" title="Modifier le projet">✎</button><button class="project-tool" data-project-delete="${project.id}" aria-label="Supprimer ${escapeHTML(project.name)}" title="Supprimer le projet">×</button></span></div>`).join('') || '<p class="empty-projects">Aucun projet pour le moment</p>';
    $('project').innerHTML = projects.map(project => `<option value="${project.id}">${escapeHTML(project.name)}</option>`).join('');
    if (selectedProject !== null && !projects.some(project => project.id === selectedProject)) selectedProject = null;
  }
  function renderStats() {
    const done = tasks.filter(task => task.status === 'DONE').length;
    $('stat-total').textContent = tasks.length; $('stat-progress').textContent = tasks.filter(task => task.status === 'IN_PROGRESS').length;
    $('stat-done').textContent = done; $('stat-late').textContent = tasks.filter(task => task.overdue).length;
    $('all-count').textContent = tasks.length; $('late-count').textContent = tasks.filter(task => task.overdue).length;
  }
  function renderTasks() {
    const list = visibleTasks();
    $('tasks').innerHTML = list.map(task => {
      const priorityClass = `priority-${task.priority.toLowerCase()}`;
      const date = task.dueDate ? `<span class="pill${task.overdue ? ' overdue' : ''}">${task.overdue ? '⚑ En retard · ' : '◷ Échéance · '}${escapeHTML(task.dueDate)}</span>` : '';
      return `<article class="task-card${task.status === 'DONE' ? ' is-done' : ''}" data-task-card="${task.id}">
        <div class="task-card-top"><input class="task-check" type="checkbox" data-complete="${task.id}" aria-label="Marquer ${escapeHTML(task.title)} comme terminée" ${task.status === 'DONE' ? 'checked' : ''}><div class="task-main"><div class="task-title">${escapeHTML(task.title)}</div>${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}<div class="task-meta"><span class="pill ${priorityClass}">${labels[task.priority]}</span><span class="pill${task.status === 'DONE' ? ' status-done' : ''}">${labels[task.status]}</span>${date}</div></div></div>
        <div class="task-footer"><span class="task-project">↳ ${escapeHTML(projectName(task.projectId))}</span><div class="task-actions"><button class="text-button" data-edit="${task.id}">Modifier</button><button class="text-button danger" data-delete="${task.id}">Supprimer</button></div></div>
      </article>`;
    }).join('') || `<div class="empty-state"><div class="empty-icon">✳</div><h3>${tasks.length ? 'Aucune tâche correspondante' : 'Votre espace est prêt'}</h3><p>${tasks.length ? 'Essayez de modifier vos filtres ou votre recherche.' : 'Créez un projet, puis ajoutez votre première tâche.'}</p>${tasks.length ? '' : '<button class="primary-button" id="empty-new-task">＋ Créer une tâche</button>'}</div>`;
  }
  function render() {
    renderProjects(); renderStats(); renderTasks();
    const selected = projects.find(project => project.id === selectedProject);
    $('page-title').textContent = selected ? selected.name : ({today:"À échéance aujourd'hui",late:'Tâches en retard'}[currentView] || 'Toutes les tâches');
    $('list-title').textContent = selected ? `Tâches · ${selected.name}` : 'Votre organisation';
    $('list-subtitle').textContent = `${visibleTasks().length} tâche(s) affichée(s)`;
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === currentView && selectedProject === null));
  }
  function openTask(task = null) {
    if (!projects.length) { toast('Créez d’abord un projet pour pouvoir ajouter une tâche.', true); $('project-modal').showModal(); return; }
    $('task-form').reset(); $('task-error').textContent = ''; $('task-id').value = task?.id || '';
    $('task-modal-title').textContent = task ? 'Modifier la tâche' : 'Créer une tâche'; $('task-submit').textContent = task ? 'Enregistrer les modifications' : 'Créer la tâche';
    $('title').value = task?.title || ''; $('description').value = task?.description || ''; $('project').value = String(task?.projectId ?? selectedProject ?? projects[0].id);
    $('priority').value = task?.priority || 'MEDIUM'; $('status').value = task?.status || 'TODO'; $('due').value = task?.dueDate || '';
    $('task-modal').showModal(); $('title').focus();
  }
  $('new-task-open').addEventListener('click', () => openTask()); $('new-project-open').addEventListener('click', () => openProject());
  function openProject(project = null) { $('project-form').reset(); $('project-error').textContent=''; $('project-id').value=project?.id || ''; $('project-modal-title').textContent=project ? 'Modifier le projet' : 'Nouveau projet'; $('project-name').value=project?.name || ''; $('project-description').value=project?.description || ''; $('project-form').querySelector('[type=submit]').textContent=project ? 'Enregistrer' : 'Créer le projet'; $('project-modal').showModal(); $('project-name').focus(); }
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  $('task-form').addEventListener('submit', async event => {
    event.preventDefault(); $('task-error').textContent = '';
    const id = $('task-id').value;
    const payload = {title:$('title').value.trim(), description:$('description').value.trim(), projectId:Number($('project').value), priority:$('priority').value, status:$('status').value, dueDate:$('due').value || null};
    try { await api(id ? `/tasks/${id}` : '/tasks', {method:id ? 'PUT' : 'POST', body:JSON.stringify(payload)}); $('task-modal').close(); await refresh(); toast(id ? 'Tâche mise à jour.' : 'Tâche créée.'); }
    catch (error) { $('task-error').textContent = error.message; }
  });
  $('project-form').addEventListener('submit', async event => {
    event.preventDefault(); $('project-error').textContent = '';
    try { const id=$('project-id').value; const project = await api(id ? `/projects/${id}` : '/projects', {method:id ? 'PUT' : 'POST', body:JSON.stringify({name:$('project-name').value.trim(),description:$('project-description').value.trim()})}); $('project-modal').close(); await refresh(); if (!id) selectedProject = project.id; render(); toast(id ? 'Projet modifié.' : 'Projet créé.'); }
    catch (error) { $('project-error').textContent = error.message; }
  });
  $('projects').addEventListener('click', async event => {
    const edit = event.target.closest('[data-project-edit]'); const del = event.target.closest('[data-project-delete]'); const button = event.target.closest('[data-project]');
    if (edit) { const project=projects.find(item=>item.id===Number(edit.dataset.projectEdit)); if(project) openProject(project); return; }
    if (del) { const project=projects.find(item=>item.id===Number(del.dataset.projectDelete)); if(!project || !window.confirm(`Supprimer le projet « ${project.name} » ?`)) return; try { await api(`/projects/${project.id}`,{method:'DELETE'}); if(selectedProject===project.id) selectedProject=null; await refresh(); toast('Projet supprimé.'); } catch(error) { toast(error.message,true); } return; }
    if (button) { selectedProject = Number(button.dataset.project); currentView = 'all'; render(); }
  });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {currentView=button.dataset.view;selectedProject=null;render();}));
  $('filter').addEventListener('change', render); $('sort').addEventListener('change', render); $('search').addEventListener('input', render);
  $('tasks').addEventListener('click', async event => {
    if (event.target.id === 'empty-new-task') return openTask();
    const edit = event.target.closest('[data-edit]'); const del = event.target.closest('[data-delete]');
    if (edit) { const task = tasks.find(item => item.id === Number(edit.dataset.edit)); if (task) openTask(task); }
    if (del) { const id = Number(del.dataset.delete); const task = tasks.find(item => item.id === id); if (!task || !window.confirm(`Supprimer la tâche « ${task.title} » ?`)) return; try { await api(`/tasks/${id}`, {method:'DELETE'}); await refresh(); toast('Tâche supprimée.'); } catch (error) { toast(error.message,true); } }
  });
  $('tasks').addEventListener('change', async event => {
    const checkbox = event.target.closest('[data-complete]'); if (!checkbox) return;
    const task = tasks.find(item => item.id === Number(checkbox.dataset.complete)); if (!task) return;
    const payload = {title:task.title,description:task.description,projectId:task.projectId,priority:task.priority,status:checkbox.checked ? 'DONE' : 'TODO',dueDate:task.dueDate};
    try { await api(`/tasks/${task.id}`, {method:'PUT',body:JSON.stringify(payload)}); await refresh(); toast(checkbox.checked ? 'Tâche terminée. Bravo !' : 'Tâche rouverte.'); }
    catch (error) { checkbox.checked = !checkbox.checked; toast(error.message,true); }
  });
  $('date-label').textContent = new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(new Date()).toLocaleUpperCase('fr');
  (async () => {
    try { db = await openDB(); await refresh(); }
    catch (error) { console.error(error); setConnection(false,'API indisponible · cache local'); if (db) { try {[projects,tasks] = await Promise.all([readCache('projects'),readCache('tasks')]);render();}catch(_){} } toast(error.message || 'Impossible de joindre le serveur.',true); }
  })();
  window.addEventListener('online', () => refresh().catch(() => {}));
})();
