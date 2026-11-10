package com.todo.dto;
import com.todo.model.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record TaskRequest(@NotBlank @Size(max=150) String title,@Size(max=2000) String description,
 @NotNull Long projectId,@NotNull Priority priority,@NotNull TaskStatus status,LocalDate dueDate) {}
