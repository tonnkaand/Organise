package com.todo.dto;
import com.todo.model.*;
import java.time.LocalDate;
public record TaskResponse(Long id,String title,String description,Long projectId,Priority priority,TaskStatus status,LocalDate dueDate,boolean overdue) {
 public static TaskResponse from(Task t){
 boolean late=t.getDueDate()!=null && t.getDueDate().isBefore(LocalDate.now()) && t.getStatus()!=TaskStatus.DONE;
 return new TaskResponse(t.getId(),t.getTitle(),t.getDescription(),t.getProject().getId(),t.getPriority(),t.getStatus(),t.getDueDate(),late);
 }
}
