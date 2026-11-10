package com.todo.exception;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestControllerAdvice public class ApiExceptionHandler {
 @ExceptionHandler(NotFoundException.class) public ResponseEntity<Map<String,String>> missing(NotFoundException e){
 return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error",e.getMessage()));}
 @ExceptionHandler(MethodArgumentNotValidException.class) public ResponseEntity<Map<String,String>> invalid(MethodArgumentNotValidException e){
 String m=e.getBindingResult().getFieldErrors().stream().map(x->x.getField()+": "+x.getDefaultMessage()).findFirst().orElse("Données invalides");
 return ResponseEntity.badRequest().body(Map.of("error",m));}
 @ExceptionHandler(IllegalStateException.class) public ResponseEntity<Map<String,String>> conflict(IllegalStateException e){
 return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error",e.getMessage()));}
}
