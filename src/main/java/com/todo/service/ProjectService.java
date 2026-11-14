
package com.todo.service;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.todo.dto.ProjectRequest;
import com.todo.exception.NotFoundException;
import com.todo.model.Project;
import com.todo.model.User;
import com.todo.repository.ProjectRepository;
import com.todo.repository.TaskRepository;
import com.todo.repository.UserRepository;

@Service
@Transactional
public class ProjectService {

    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final UserRepository users;

    public ProjectService(
            ProjectRepository projects,
            TaskRepository tasks,
            UserRepository users) {

        this.projects = projects;
        this.tasks = tasks;
        this.users = users;
    }

    // Récupérer l'adresse email de l'utilisateur connecté
    private String currentUserEmail() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName().equals("anonymousUser")) {

            throw new SecurityException("Vous devez être connecté.");
        }

        return authentication.getName();
    }

    // Récupérer uniquement les projets de l'utilisateur connecté
    public List<Project> findAll() {
        return projects.findAllByOwnerEmailIgnoreCase(
                currentUserEmail()
        );
    }

    // Rechercher un projet appartenant à l'utilisateur connecté
    public Project findById(Long id) {

        return projects.findByIdAndOwnerEmailIgnoreCase(
                id,
                currentUserEmail()
        ).orElseThrow(() ->
                new NotFoundException("Projet introuvable : " + id)
        );
    }

    // Créer un projet et lui attribuer automatiquement son propriétaire
    public Project create(ProjectRequest request) {

        String email = currentUserEmail();

        User owner = users.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new SecurityException("Utilisateur introuvable.")
                );

        Project project = new Project(
                request.name().trim(),
                request.description()
        );

        project.setOwner(owner);

        return projects.save(project);
    }

    // Modifier uniquement un projet appartenant à l'utilisateur
    public Project update(Long id, ProjectRequest request) {

        Project project = findById(id);

        project.setName(request.name().trim());
        project.setDescription(request.description());

        return projects.save(project);
    }

    // Supprimer uniquement un projet appartenant à l'utilisateur
    public void delete(Long id) {

        Project project = findById(id);

        if (!tasks.findByProjectId(id).isEmpty()) {
            throw new IllegalStateException(
                    "Supprimez ou déplacez les tâches avant de supprimer ce projet."
            );
        }

        projects.delete(project);
    }
}
