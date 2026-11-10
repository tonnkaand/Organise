package com.todo.dto;
import com.todo.model.*;import org.junit.jupiter.api.Test;import java.time.LocalDate;import static org.junit.jupiter.api.Assertions.*;
class TaskResponseTest{
@Test void overdueWhenPastAndNotDone(){Task t=new Task("T",null,new Project("P",null),Priority.LOW,TaskStatus.TODO,LocalDate.now().minusDays(1));assertTrue(TaskResponse.from(t).overdue());}
@Test void completedTaskIsNeverOverdue(){Task t=new Task("T",null,new Project("P",null),Priority.LOW,TaskStatus.DONE,LocalDate.now().minusDays(1));assertFalse(TaskResponse.from(t).overdue());}
@Test void noDateMeansNotOverdue(){Task t=new Task("T",null,new Project("P",null),Priority.LOW,TaskStatus.TODO,null);assertFalse(TaskResponse.from(t).overdue());}
}
