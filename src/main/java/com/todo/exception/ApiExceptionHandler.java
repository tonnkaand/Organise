
package com.todo.exception;

import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    // Ressource introuvable ou n'appartenant pas à l'utilisateur
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, String>> missing(
            NotFoundException exception) {

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", exception.getMessage()));
    }

    // Données envoyées invalides
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> invalid(
            MethodArgumentNotValidException exception) {

        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error ->
                        error.getField() + ": " + error.getDefaultMessage()
                )
                .findFirst()
                .orElse("Données invalides");

        return ResponseEntity
                .badRequest()
                .body(Map.of("error", message));
    }

    // Opération incompatible avec l'état actuel des données
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> conflict(
            IllegalStateException exception) {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", exception.getMessage()));
    }

    // Utilisateur authentifié mais accès interdit
    @ExceptionHandler({
            AccessDeniedException.class,
            SecurityException.class
    })
    public ResponseEntity<Map<String, String>> forbidden(
            RuntimeException exception) {

        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "error",
                        "Vous n'avez pas l'autorisation d'effectuer cette opération."
                ));
    }

    // Conflit d'intégrité en base de données
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> dataConflict(
            DataIntegrityViolationException exception) {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of(
                        "error",
                        "Cette opération provoque un conflit avec les données existantes."
                ));
    }
}
