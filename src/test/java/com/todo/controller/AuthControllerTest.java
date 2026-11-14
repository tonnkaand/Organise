
package com.todo.controller;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.transaction.annotation.Transactional;

import com.todo.repository.UserRepository;

import jakarta.servlet.http.Cookie;
@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    /*
     * Récupère un jeton CSRF et le cookie associé.
     * Les requêtes POST devront transmettre les deux.
     */
    private CsrfData getCsrfToken() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();

        Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");

        String responseBody = result.getResponse().getContentAsString();
        String token = com.jayway.jsonpath.JsonPath
                .read(responseBody, "$.token");

        assertNotNull(cookie, "Le cookie CSRF doit être présent.");

        return new CsrfData(cookie, token);
    }

    private record CsrfData(Cookie cookie, String token) {
    }

    private String registerJson() {
        return """
                {
                    "name": "Utilisateur Test",
                    "email": "test.auth@example.com",
                    "password": "MotDePasse123"
                }
                """;
    }

    private void registerUser(CsrfData csrf) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson()))
                .andExpect(status().isCreated());
    }

    @Test
    void registerCreatesNewUser() throws Exception {
        CsrfData csrf = getCsrfToken();

        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Utilisateur Test"))
                .andExpect(jsonPath("$.email").value("test.auth@example.com"));

        org.junit.jupiter.api.Assertions.assertTrue(
                userRepository.existsByEmailIgnoreCase("test.auth@example.com")
        );
    }

    @Test
    void registerRejectsDuplicateEmail() throws Exception {
        CsrfData csrf = getCsrfToken();

        registerUser(csrf);

        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginAcceptsCorrectCredentialsAndCreatesSession() throws Exception {
        CsrfData csrf = getCsrfToken();

        registerUser(csrf);

        String loginJson = """
                {
                    "email": "test.auth@example.com",
                    "password": "MotDePasse123"
                }
                """;

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test.auth@example.com"))
                .andReturn();

        MockHttpSession session = (MockHttpSession)
                loginResult.getRequest().getSession(false);

        assertNotNull(session, "Une session doit être créée après connexion.");

        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test.auth@example.com"));
    }

    @Test
    void loginRejectsIncorrectPassword() throws Exception {
        CsrfData csrf = getCsrfToken();

        registerUser(csrf);

        String loginJson = """
                {
                    "email": "test.auth@example.com",
                    "password": "MauvaisMotDePasse"
                }
                """;

        mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutEndsUserSession() throws Exception {
        CsrfData csrf = getCsrfToken();

        registerUser(csrf);

        String loginJson = """
                {
                    "email": "test.auth@example.com",
                    "password": "MotDePasse123"
                }
                """;

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession)
                loginResult.getRequest().getSession(false);

        assertNotNull(session);

        mockMvc.perform(post("/api/auth/logout")
                        .session(session)
                        .cookie(csrf.cookie())
                        .header("X-XSRF-TOKEN", csrf.token()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void privateEndpointRejectsUnauthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }
}
