package com.todo.controller;
import com.todo.dto.*;import com.todo.service.ProjectService;import jakarta.validation.Valid;import org.springframework.http.HttpStatus;import org.springframework.web.bind.annotation.*;import java.util.List;
@RestController @RequestMapping("/api/projects") @CrossOrigin public class ProjectController {
 private final ProjectService service; public ProjectController(ProjectService s){service=s;}
 @GetMapping public List<ProjectResponse> all(){return service.findAll().stream().map(ProjectResponse::from).toList();}
 @GetMapping("/{id}") public ProjectResponse one(@PathVariable Long id){return ProjectResponse.from(service.findById(id));}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public ProjectResponse create(@Valid @RequestBody ProjectRequest r){return ProjectResponse.from(service.create(r));}
 @PutMapping("/{id}") public ProjectResponse update(@PathVariable Long id,@Valid @RequestBody ProjectRequest r){return ProjectResponse.from(service.update(id,r));}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id){service.delete(id);}
}
