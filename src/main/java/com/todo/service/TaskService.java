package com.todo.service;
import com.todo.dto.TaskRequest; import com.todo.exception.NotFoundException; import com.todo.model.*;
import com.todo.repository.TaskRepository; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service @Transactional public class TaskService {
 private final TaskRepository tasks; private final ProjectService projects;
 public TaskService(TaskRepository t,ProjectService p){tasks=t;projects=p;}
 public List<Task> findAll(){return tasks.findAll();}
 public List<Task> findByProject(Long id){projects.findById(id);return tasks.findByProjectId(id);}
 public Task findById(Long id){return tasks.findById(id).orElseThrow(()->new NotFoundException("Tâche introuvable: "+id));}
 public Task create(TaskRequest r){Project p=projects.findById(r.projectId());return tasks.save(new Task(r.title().trim(),r.description(),p,r.priority(),r.status(),r.dueDate()));}
 public Task update(Long id,TaskRequest r){Task t=findById(id);Project p=projects.findById(r.projectId());t.update(r.title().trim(),r.description(),p,r.priority(),r.status(),r.dueDate());return tasks.save(t);}
 public void delete(Long id){tasks.delete(findById(id));}
}
