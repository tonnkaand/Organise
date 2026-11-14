
package com.todo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(

    @NotBlank(message = "L'adresse email est obligatoire.")
    @Email(message = "L'adresse email est invalide.")
    @Size(max = 150, message = "L'adresse email est trop longue.")
    String email,

    @NotBlank(message = "Le mot de passe est obligatoire.")
    @Size(max = 72, message = "Le mot de passe est trop long.")
    String password

) {}
