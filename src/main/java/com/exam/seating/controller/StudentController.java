package com.exam.seating.controller;

import com.exam.seating.model.Student;
import com.exam.seating.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {

    @Autowired
    private StudentRepository studentRepository;

    @GetMapping
    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> addStudent(@RequestBody Student student) {
        if (student.getRollNo() == null || student.getRollNo().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Roll number cannot be empty");
        }
        student.setRollNo(student.getRollNo().trim().toUpperCase());
        student.setBranch(student.getBranch().trim().toUpperCase());
        Student saved = studentRepository.save(student);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> addStudentsBulk(@RequestBody List<Student> students) {
        if (students == null || students.isEmpty()) {
            return ResponseEntity.badRequest().body("Student list cannot be empty");
        }
        for (Student s : students) {
            if (s.getRollNo() != null) s.setRollNo(s.getRollNo().trim().toUpperCase());
            if (s.getBranch() != null) s.setBranch(s.getBranch().trim().toUpperCase());
        }
        List<Student> saved = studentRepository.saveAll(students);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{rollNo}")
    public ResponseEntity<?> deleteStudent(@PathVariable String rollNo) {
        studentRepository.deleteById(rollNo);
        return ResponseEntity.ok("Student " + rollNo + " removed.");
    }

    @DeleteMapping
    public ResponseEntity<?> clearAllStudents() {
        studentRepository.deleteAll();
        return ResponseEntity.ok("All students removed.");
    }
}
