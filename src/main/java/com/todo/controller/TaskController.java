package com.todo.controller;
import com.todo.dto.*;import com.todo.service.TaskService;import jakarta.validation.Valid;import org.springframework.http.HttpStatus;import org.springframework.web.bind.annotation.*;import java.util.List;
@RestController @RequestMapping("/api/tasks") @CrossOrigin public class TaskController {
 private final TaskService service;public TaskController(TaskService s){service=s;}
 @GetMapping public List<TaskResponse> all(){return service.findAll().stream().map(TaskResponse::from).toList();}
 @GetMapping("/{id}") public TaskResponse one(@PathVariable Long id){return TaskResponse.from(service.findById(id));}
 @GetMapping("/by-project/{projectId}") public List<TaskResponse> byProject(@PathVariable Long projectId){return service.findByProject(projectId).stream().map(TaskResponse::from).toList();}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public TaskResponse create(@Valid @RequestBody TaskRequest r){return TaskResponse.from(service.create(r));}
 @PutMapping("/{id}") public TaskResponse update(@PathVariable Long id,@Valid @RequestBody TaskRequest r){return TaskResponse.from(service.update(id,r));}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
