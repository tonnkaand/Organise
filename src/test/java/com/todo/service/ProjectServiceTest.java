
package com.todo.service;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.todo.dto.ProjectRequest;
import com.todo.exception.NotFoundException;
import com.todo.model.Project;
import com.todo.repository.ProjectRepository;
import com.todo.repository.TaskRepository;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    ProjectRepository repo;

    @Mock
    TaskRepository taskRepo;

    @InjectMocks
    ProjectService service;

    @Test
    void findAllReturnsAllProjects() {
        List<Project> expected = List.of(
                new Project("Cours", null),
                new Project("Travail", null)
        );

        when(repo.findAll()).thenReturn(expected);

        List<Project> result = service.findAll();

        assertSame(expected, result);
        verify(repo).findAll();
    }

    @Test
    void findByIdReturnsExistingProject() {
        Project project = new Project("Cours", null);

        when(repo.findById(1L)).thenReturn(Optional.of(project));

        Project result = service.findById(1L);

        assertSame(project, result);
        assertEquals("Cours", result.getName());
    }

    @Test
    void unknownProjectThrows() {
        when(repo.findById(2L)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> service.findById(2L)
        );
    }

    @Test
    void trimsNameOnCreate() {
        when(repo.save(any(Project.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Project result = service.create(
                new ProjectRequest(" Cours ", null)
        );

        assertEquals("Cours", result.getName());
        verify(repo).save(any(Project.class));
    }

    @Test
    void updateChangesProjectAndSavesIt() {
        Project project = new Project("Ancien nom", null);

        when(repo.findById(1L)).thenReturn(Optional.of(project));
        when(repo.save(project)).thenReturn(project);

        Project result = service.update(
                1L,
                new ProjectRequest(" Nouveau nom ", "Description")
        );

        assertSame(project, result);
        assertEquals("Nouveau nom", result.getName());
        verify(repo).findById(1L);
        verify(repo).save(project);
    }

    @Test
    void refusesDeleteWhenTasksExist() {
        Project project = new Project("P", null);

        when(repo.findById(1L)).thenReturn(Optional.of(project));
        when(taskRepo.findByProjectId(1L))
                .thenReturn(List.of(mock(com.todo.model.Task.class)));

        assertThrows(
                IllegalStateException.class,
                () -> service.delete(1L)
        );

        verify(repo, never()).delete(project);
    }

    @Test
    void deletesEmptyProject() {
        Project project = new Project("P", null);

        when(repo.findById(1L)).thenReturn(Optional.of(project));
        when(taskRepo.findByProjectId(1L)).thenReturn(List.of());

        service.delete(1L);

        verify(repo).delete(project);
    }

    @Test
    void deletingUnknownProjectThrows() {
        when(repo.findById(9L)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> service.delete(9L)
        );

        verify(taskRepo, never()).findByProjectId(anyLong());
        verify(repo, never()).delete(any(Project.class));
    }
}
