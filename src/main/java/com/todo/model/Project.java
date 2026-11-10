package com.todo.model;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
@Entity @Table(name="projects")
public class Project {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @NotBlank @Size(max=100) @Column(nullable=false,length=100) private String name;
 @Size(max=500) private String description;
 protected Project() {}
 public Project(String name,String description){this.name=name;this.description=description;}
 public Long getId(){return id;} public String getName(){return name;} public String getDescription(){return description;}
 public void setName(String name){this.name=name;} public void setDescription(String description){this.description=description;}
}
