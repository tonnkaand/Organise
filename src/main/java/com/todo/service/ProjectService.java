package com.todo.service;
import com.todo.dto.ProjectRequest; import com.todo.exception.NotFoundException; import com.todo.model.Project;
import com.todo.repository.*; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service @Transactional public class ProjectService {
 private final ProjectRepository projects; private final TaskRepository tasks;
 public ProjectService(ProjectRepository p,TaskRepository t){projects=p;tasks=t;}
 public List<Project> findAll(){return projects.findAll();}
 public Project findById(Long id){return projects.findById(id).orElseThrow(()->new NotFoundException("Projet introuvable: "+id));}
 public Project create(ProjectRequest r){return projects.save(new Project(r.name().trim(),r.description()));}
 public Project update(Long id,ProjectRequest r){Project p=findById(id);p.setName(r.name().trim());p.setDescription(r.description());return projects.save(p);}
 public void delete(Long id){Project p=findById(id);if(!tasks.findByProjectId(id).isEmpty())throw new IllegalStateException("Supprimez ou déplacez les tâches avant de supprimer ce projet.");projects.delete(p);}
}
