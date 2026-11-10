package com.todo.dto;
import jakarta.validation.constraints.*;
public record ProjectRequest(@NotBlank @Size(max=100) String name,@Size(max=500) String description) {}
