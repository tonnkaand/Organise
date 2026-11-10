package com.todo.model;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
@Entity @Table(name="tasks")
public class Task {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @NotBlank @Size(max=150) @Column(nullable=false,length=150) private String title;
 @Size(max=2000) private String description;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="project_id",nullable=false) private Project project;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private Priority priority;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private TaskStatus status;
 private LocalDate dueDate;
 protected Task() {}
 public Task(String title,String description,Project project,Priority priority,TaskStatus status,LocalDate dueDate){
 this.title=title;this.description=description;this.project=project;this.priority=priority;this.status=status;this.dueDate=dueDate;}
 public Long getId(){return id;} public String getTitle(){return title;} public String getDescription(){return description;}
 public Project getProject(){return project;} public Priority getPriority(){return priority;} public TaskStatus getStatus(){return status;}
 public LocalDate getDueDate(){return dueDate;}
 public void update(String title,String description,Project project,Priority priority,TaskStatus status,LocalDate dueDate){
 this.title=title;this.description=description;this.project=project;this.priority=priority;this.status=status;this.dueDate=dueDate;}
}
