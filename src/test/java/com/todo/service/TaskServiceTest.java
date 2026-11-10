
package com.todo.service;

import java.time.LocalDate;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.todo.dto.TaskRequest;
import com.todo.exception.NotFoundException;
import com.todo.model.Priority;
import com.todo.model.Project;
import com.todo.model.Task;
import com.todo.model.TaskStatus;
import com.todo.repository.TaskRepository;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    TaskRepository taskRepo;

    @Mock
    ProjectService projectService;

    @InjectMocks
    TaskService service;

    private TaskRequest request(Long projectId) {
        return new TaskRequest(
                "  Réviser Java  ",
                "Préparer les exercices",
                projectId,
                Priority.HIGH,
                TaskStatus.IN_PROGRESS,
                LocalDate.of(2026, 12, 15)
        );
    }

    private Project project() {
        return new Project("Formation", "Projet de formation");
    }

    private Task task(Project project) {
        return new Task(
                "Ancienne tâche",
                "Ancienne description",
                project,
                Priority.LOW,
                TaskStatus.TODO,
                LocalDate.of(2026, 12, 1)
        );
    }

    @Test
    void findAllReturnsAllTasks() {
        Project project = project();
        List<Task> expected = List.of(task(project), task(project));

        when(taskRepo.findAll()).thenReturn(expected);

        List<Task> result = service.findAll();

        assertSame(expected, result);
        verify(taskRepo).findAll();
    }

    @Test
    void findByProjectReturnsTasksWhenProjectExists() {
        Project project = project();
        List<Task> expected = List.of(task(project));

        when(projectService.findById(1L)).thenReturn(project);
        when(taskRepo.findByProjectId(1L)).thenReturn(expected);

        List<Task> result = service.findByProject(1L);

        assertSame(expected, result);
        verify(projectService).findById(1L);
        verify(taskRepo).findByProjectId(1L);
    }

    @Test
    void findByProjectThrowsWhenProjectDoesNotExist() {
        when(projectService.findById(1L))
                .thenThrow(new NotFoundException("Projet introuvable: 1"));

        assertThrows(
                NotFoundException.class,
                () -> service.findByProject(1L)
        );

        verify(taskRepo, never()).findByProjectId(anyLong());
    }

    @Test
    void findByIdReturnsExistingTask() {
        Project project = project();
        Task expected = task(project);

        when(taskRepo.findById(1L)).thenReturn(Optional.of(expected));

        Task result = service.findById(1L);

        assertSame(expected, result);
        verify(taskRepo).findById(1L);
    }

    @Test
    void findByIdThrowsWhenTaskDoesNotExist() {
        when(taskRepo.findById(5L)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> service.findById(5L)
        );
    }

    @Test
    void createTrimsTitleAndSavesTaskWithProject() {
        Project project = project();

        when(projectService.findById(1L)).thenReturn(project);
        when(taskRepo.save(any(Task.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Task result = service.create(request(1L));

        assertEquals("Réviser Java", result.getTitle());
        assertEquals("Préparer les exercices", result.getDescription());
        assertSame(project, result.getProject());
        assertEquals(Priority.HIGH, result.getPriority());
        assertEquals(TaskStatus.IN_PROGRESS, result.getStatus());
        assertEquals(LocalDate.of(2026, 12, 15), result.getDueDate());

        verify(projectService).findById(1L);
        verify(taskRepo).save(any(Task.class));
    }

    @Test
    void createThrowsWhenProjectDoesNotExist() {
        when(projectService.findById(99L))
                .thenThrow(new NotFoundException("Projet introuvable: 99"));

        assertThrows(
                NotFoundException.class,
                () -> service.create(request(99L))
        );

        verify(taskRepo, never()).save(any(Task.class));
    }

    @Test
    void updateChangesAllTaskFieldsAndSaves() {
        Project oldProject = project();
        Project newProject = new Project("Nouveau projet", null);
        Task existingTask = task(oldProject);

        when(taskRepo.findById(1L)).thenReturn(Optional.of(existingTask));
        when(projectService.findById(2L)).thenReturn(newProject);
        when(taskRepo.save(existingTask)).thenReturn(existingTask);

        Task result = service.update(1L, request(2L));

        assertSame(existingTask, result);
        assertEquals("Réviser Java", result.getTitle());
        assertEquals("Préparer les exercices", result.getDescription());
        assertSame(newProject, result.getProject());
        assertEquals(Priority.HIGH, result.getPriority());
        assertEquals(TaskStatus.IN_PROGRESS, result.getStatus());
        assertEquals(LocalDate.of(2026, 12, 15), result.getDueDate());

        verify(taskRepo).findById(1L);
        verify(projectService).findById(2L);
        verify(taskRepo).save(existingTask);
    }

    @Test
    void updateThrowsWhenTaskDoesNotExist() {
        when(taskRepo.findById(10L)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> service.update(10L, request(2L))
        );

        verify(projectService, never()).findById(anyLong());
        verify(taskRepo, never()).save(any(Task.class));
    }

    @Test
    void updateThrowsWhenNewProjectDoesNotExist() {
        Project oldProject = project();
        Task existingTask = task(oldProject);

        when(taskRepo.findById(1L)).thenReturn(Optional.of(existingTask));
        when(projectService.findById(99L))
                .thenThrow(new NotFoundException("Projet introuvable: 99"));

        assertThrows(
                NotFoundException.class,
                () -> service.update(1L, request(99L))
        );

        assertEquals("Ancienne tâche", existingTask.getTitle());
        verify(taskRepo, never()).save(any(Task.class));
    }

    @Test
    void deleteRemovesExistingTask() {
        Project project = project();
        Task existingTask = task(project);

        when(taskRepo.findById(1L)).thenReturn(Optional.of(existingTask));

        service.delete(1L);

        verify(taskRepo).findById(1L);
        verify(taskRepo).delete(existingTask);
    }

    @Test
    void deleteThrowsWhenTaskDoesNotExist() {
        when(taskRepo.findById(50L)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> service.delete(50L)
        );

        verify(taskRepo, never()).delete(any(Task.class));
    }
}
