
package com.todo.service;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.todo.dto.ProjectRequest;
import com.todo.exception.NotFoundException;
import com.todo.model.Project;
import com.todo.model.User;
import com.todo.repository.ProjectRepository;
import com.todo.repository.TaskRepository;
import com.todo.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    private static final String TEST_EMAIL = "test@example.com";

    @Mock
    ProjectRepository repo;

    @Mock
    TaskRepository taskRepo;

    @Mock
    UserRepository userRepo;

    @InjectMocks
    ProjectService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(
                TEST_EMAIL,
                "password",
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
            )
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void findAllReturnsAllProjects() {
        List<Project> expected = List.of(
            new Project("Cours", null),
            new Project("Travail", null)
        );

        when(repo.findAllByOwnerEmailIgnoreCase(TEST_EMAIL))
            .thenReturn(expected);

        List<Project> result = service.findAll();

        assertSame(expected, result);
        verify(repo).findAllByOwnerEmailIgnoreCase(TEST_EMAIL);
    }

    @Test
    void findByIdReturnsExistingProject() {
        Project project = new Project("Cours", null);

        when(repo.findByIdAndOwnerEmailIgnoreCase(1L, TEST_EMAIL))
            .thenReturn(Optional.of(project));

        Project result = service.findById(1L);

        assertSame(project, result);
        assertEquals("Cours", result.getName());
    }

    @Test
    void unknownProjectThrows() {
        when(repo.findByIdAndOwnerEmailIgnoreCase(2L, TEST_EMAIL))
            .thenReturn(Optional.empty());

        assertThrows(
            NotFoundException.class,
            () -> service.findById(2L)
        );
    }

    @Test
    void trimsNameOnCreate() {
        User user = new User("Utilisateur test", TEST_EMAIL, "password-hash");

        when(userRepo.findByEmailIgnoreCase(TEST_EMAIL))
            .thenReturn(Optional.of(user));

        when(repo.save(any(Project.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        Project result = service.create(
            new ProjectRequest(" Cours ", null)
        );

        assertEquals("Cours", result.getName());
        assertSame(user, result.getOwner());

        verify(userRepo).findByEmailIgnoreCase(TEST_EMAIL);
        verify(repo).save(any(Project.class));
    }

    @Test
    void updateChangesProjectAndSavesIt() {
        Project project = new Project("Ancien nom", null);

        when(repo.findByIdAndOwnerEmailIgnoreCase(1L, TEST_EMAIL))
            .thenReturn(Optional.of(project));

        when(repo.save(project)).thenReturn(project);

        Project result = service.update(
            1L,
            new ProjectRequest(" Nouveau nom ", "Description")
        );

        assertSame(project, result);
        assertEquals("Nouveau nom", result.getName());

        verify(repo).findByIdAndOwnerEmailIgnoreCase(1L, TEST_EMAIL);
        verify(repo).save(project);
    }

    @Test
    void refusesDeleteWhenTasksExist() {
        Project project = new Project("P", null);

        when(repo.findByIdAndOwnerEmailIgnoreCase(1L, TEST_EMAIL))
            .thenReturn(Optional.of(project));

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

        when(repo.findByIdAndOwnerEmailIgnoreCase(1L, TEST_EMAIL))
            .thenReturn(Optional.of(project));

        when(taskRepo.findByProjectId(1L)).thenReturn(List.of());

        service.delete(1L);

        verify(repo).delete(project);
    }

    @Test
    void deletingUnknownProjectThrows() {
        when(repo.findByIdAndOwnerEmailIgnoreCase(9L, TEST_EMAIL))
            .thenReturn(Optional.empty());

        assertThrows(
            NotFoundException.class,
            () -> service.delete(9L)
        );

        verify(taskRepo, never()).findByProjectId(anyLong());
        verify(repo, never()).delete(any(Project.class));
    }
}
