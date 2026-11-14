
package com.todo.controller;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class UserIsolationTest {

    @Autowired
    private MockMvc mockMvc;

    private record CsrfData(Cookie cookie, String token) {}

    private record UserSession(MockHttpSession session, CsrfData csrf) {}

    private CsrfData getCsrf() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();

        Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");

        String body = result.getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.token");

        assertNotNull(cookie);

        return new CsrfData(cookie, token);
    }

    private void register(String name, String email) throws Exception {
        CsrfData csrf = getCsrf();

        String json = """
                {
                    "name": "%s",
                    "email": "%s",
                    "password": "MotDePasse123"
                }
                """.formatted(name, email);

        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());
    }

    private UserSession login(String email) throws Exception {
        CsrfData csrf = getCsrf();

        String json = """
                {
                    "email": "%s",
                    "password": "MotDePasse123"
                }
                """.formatted(email);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession)
                result.getRequest().getSession(false);

        assertNotNull(session, "La session utilisateur doit exister.");

        return new UserSession(session, csrf);
    }

    private Long createProject(UserSession user, String name)
            throws Exception {

        CsrfData csrf = getCsrf();

        String json = """
                {
                    "name": "%s",
                    "description": "Projet privé"
                }
                """.formatted(name);

        MvcResult result = mockMvc.perform(post("/api/projects")
                        .session(user.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn();

        Number id = JsonPath.read(
                result.getResponse().getContentAsString(),
                "$.id"
        );

        return id.longValue();
    }

    private Long createTask(
            UserSession user,
            Long projectId,
            String title) throws Exception {

        CsrfData csrf = getCsrf();

        String json = """
                {
                    "title": "%s",
                    "description": "Tâche privée",
                    "projectId": %d,
                    "priority": "HIGH",
                    "status": "TODO",
                    "dueDate": "2026-12-01"
                }
                """.formatted(title, projectId);

        MvcResult result = mockMvc.perform(post("/api/tasks")
                        .session(user.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn();

        Number id = JsonPath.read(
                result.getResponse().getContentAsString(),
                "$.id"
        );

        return id.longValue();
    }

    private CsrfData freshCsrf() throws Exception {
        return getCsrf();
    }

    @Test
    void userCannotAccessAnotherUsersProjects() throws Exception {

        // Création des deux utilisateurs
        register("Utilisateur A", "isolation.a@example.com");
        register("Utilisateur B", "isolation.b@example.com");

        // Connexion des deux utilisateurs
        UserSession userA = login("isolation.a@example.com");
        UserSession userB = login("isolation.b@example.com");

        // Chaque utilisateur crée son propre projet
        Long projectA = createProject(userA, "Projet A");
        Long projectB = createProject(userB, "Projet B");

        // A ne voit que son projet
        MvcResult listResult = mockMvc.perform(
                        get("/api/projects")
                                .session(userA.session()))
                .andExpect(status().isOk())
                .andReturn();

        List<?> projects = JsonPath.read(
                listResult.getResponse().getContentAsString(), "$");

        assertEquals(1, projects.size());

        // A ne peut pas consulter le projet de B
        mockMvc.perform(get("/api/projects/{id}", projectB)
                        .session(userA.session()))
                .andExpect(status().isNotFound());

        // A ne peut pas modifier le projet de B
        CsrfData csrf = freshCsrf();

        mockMvc.perform(put("/api/projects/{id}", projectB)
                        .session(userA.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Projet piraté",
                                    "description": "Modification interdite"
                                }
                                """))
                .andExpect(status().isNotFound());

        // A ne peut pas supprimer le projet de B
        csrf = freshCsrf();

        mockMvc.perform(delete("/api/projects/{id}", projectB)
                        .session(userA.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token()))
                .andExpect(status().isNotFound());

        // B conserve l'accès à son projet
        mockMvc.perform(get("/api/projects/{id}", projectB)
                        .session(userB.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Projet B"));

        // A conserve également son propre projet
        mockMvc.perform(get("/api/projects/{id}", projectA)
                        .session(userA.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Projet A"));
    }

    @Test
    void userCannotAccessAnotherUsersTasks() throws Exception {

        // Création et connexion des utilisateurs
        register("Utilisateur A", "tasks.a@example.com");
        register("Utilisateur B", "tasks.b@example.com");

        UserSession userA = login("tasks.a@example.com");
        UserSession userB = login("tasks.b@example.com");

        // Chaque utilisateur crée son projet
        Long projectA = createProject(userA, "Projet tâches A");
        Long projectB = createProject(userB, "Projet tâches B");

        // Chaque utilisateur crée une tâche
        Long taskA = createTask(userA, projectA, "Tâche A");
        Long taskB = createTask(userB, projectB, "Tâche B");

        // A ne voit que ses tâches
        MvcResult listResult = mockMvc.perform(
                        get("/api/tasks")
                                .session(userA.session()))
                .andExpect(status().isOk())
                .andReturn();

        List<?> tasks = JsonPath.read(
                listResult.getResponse().getContentAsString(), "$");

        assertEquals(1, tasks.size());

        // A ne peut pas consulter la tâche de B
        mockMvc.perform(get("/api/tasks/{id}", taskB)
                        .session(userA.session()))
                .andExpect(status().isNotFound());

        // A ne peut pas consulter les tâches du projet de B
        mockMvc.perform(
                        get("/api/tasks/by-project/{projectId}", projectB)
                                .session(userA.session()))
                .andExpect(status().isNotFound());

        // A ne peut pas modifier la tâche de B
        CsrfData csrf = freshCsrf();

        String updateJson = """
                {
                    "title": "Tâche modifiée",
                    "description": "Modification interdite",
                    "projectId": %d,
                    "priority": "LOW",
                    "status": "DONE",
                    "dueDate": "2026-12-10"
                }
                """.formatted(projectA);

        mockMvc.perform(put("/api/tasks/{id}", taskB)
                        .session(userA.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isNotFound());

        // A ne peut pas supprimer la tâche de B
        csrf = freshCsrf();

        mockMvc.perform(delete("/api/tasks/{id}", taskB)
                        .session(userA.session())
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token()))
                .andExpect(status().isNotFound());

        // B conserve l'accès à sa tâche
        mockMvc.perform(get("/api/tasks/{id}", taskB)
                        .session(userB.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Tâche B"));

        // A conserve l'accès à sa propre tâche
        mockMvc.perform(get("/api/tasks/{id}", taskA)
                        .session(userA.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Tâche A"));
    }
}
