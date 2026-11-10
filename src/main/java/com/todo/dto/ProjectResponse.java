package com.todo.dto;
import com.todo.model.Project;
public record ProjectResponse(Long id,String name,String description) {
 public static ProjectResponse from(Project p){return new ProjectResponse(p.getId(),p.getName(),p.getDescription());}
}
