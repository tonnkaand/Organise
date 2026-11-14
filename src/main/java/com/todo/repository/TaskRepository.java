
package com.todo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.todo.model.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByProjectId(Long projectId);

    List<Task> findAllByProjectOwnerEmailIgnoreCase(String email);

    Optional<Task> findByIdAndProjectOwnerEmailIgnoreCase(Long id, String email);
}
