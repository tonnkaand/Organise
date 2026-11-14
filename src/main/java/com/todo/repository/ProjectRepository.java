
package com.todo.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.todo.model.Project;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findAllByOwnerEmailIgnoreCase(String email);

    Optional<Project> findByIdAndOwnerEmailIgnoreCase(Long id, String email);
}
