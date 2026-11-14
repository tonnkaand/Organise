
package com.todo.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.todo.dto.TaskRequest;
import com.todo.exception.NotFoundException;
import com.todo.model.Project;
import com.todo.model.Task;
import com.todo.repository.TaskRepository;

@Service
@Transactional
public class TaskService {

    private final TaskRepository tasks;
    private final ProjectService projects;

    public TaskService(TaskRepository tasks, ProjectService projects) {
        this.tasks = tasks;
        this.projects = projects;
    }

    // Afficher uniquement les tâches de l'utilisateur connecté
    public List<Task> findAll() {

        return tasks.findAllByProjectOwnerEmailIgnoreCase(
                currentUserEmail()
        );
    }

    // Afficher les tâches d'un projet appartenant à l'utilisateur
    public List<Task> findByProject(Long projectId) {

        projects.findById(projectId);

        return tasks.findByProjectId(projectId);
    }

    // Rechercher une tâche appartenant à l'utilisateur
    public Task findById(Long id) {

        return tasks.findByIdAndProjectOwnerEmailIgnoreCase(
                id,
                currentUserEmail()
        ).orElseThrow(() ->
                new NotFoundException("Tâche introuvable : " + id)
        );
    }

    // Créer une tâche dans l'un de ses propres projets
    public Task create(TaskRequest request) {

        Project project = projects.findById(request.projectId());

        Task task = new Task(
                request.title().trim(),
                request.description(),
                project,
                request.priority(),
                request.status(),
                request.dueDate()
        );

        return tasks.save(task);
    }

    // Modifier une tâche uniquement si elle lui appartient
    public Task update(Long id, TaskRequest request) {

        Task task = findById(id);

        // Vérifie également que le nouveau projet appartient à l'utilisateur
        Project project = projects.findById(request.projectId());

        task.update(
                request.title().trim(),
                request.description(),
                project,
                request.priority(),
                request.status(),
                request.dueDate()
        );

        return tasks.save(task);
    }

    // Supprimer uniquement ses propres tâches
    public void delete(Long id) {

        Task task = findById(id);

        tasks.delete(task);
    }

    private String currentUserEmail() {
        return org.springframework.security.core.context.SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();
    }
}
