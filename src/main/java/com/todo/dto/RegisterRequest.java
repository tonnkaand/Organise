
package com.todo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

    @NotBlank(message = "Le nom est obligatoire.")
    @Size(max = 100, message = "Le nom ne doit pas dépasser 100 caractères.")
    String name,

    @NotBlank(message = "L'adresse email est obligatoire.")
    @Email(message = "L'adresse email est invalide.")
    @Size(max = 150, message = "L'adresse email est trop longue.")
    String email,

    @NotBlank(message = "Le mot de passe est obligatoire.")
    @Size(min = 8, max = 72,
          message = "Le mot de passe doit contenir entre 8 et 72 caractères.")
    String password

) {}
