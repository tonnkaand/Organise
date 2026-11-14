
package com.todo.service;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.todo.model.User;
import com.todo.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User register(String name, String email, String password) {

        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Le nom est obligatoire.");
        }

        if (email == null || email.isBlank()
                || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("L'adresse email est invalide.");
        }

        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException(
                    "Le mot de passe doit contenir au moins 8 caractères."
            );
        }

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException(
                    "Cette adresse email est déjà utilisée."
            );
        }

        String passwordHash = passwordEncoder.encode(password);

        User user = new User(
                name.trim(),
                normalizedEmail,
                passwordHash
        );

        return userRepository.save(user);
    }
}
