package com.exam.seating;

import com.exam.seating.model.Hall;
import com.exam.seating.model.Student;
import com.exam.seating.repository.HallRepository;
import com.exam.seating.repository.StudentRepository;
import com.exam.seating.service.SeatingAllocationService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.Arrays;
import java.util.List;

@SpringBootApplication
public class ExamSeatingApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExamSeatingApplication.class, args);
        System.out.println("==================================================================");
        System.out.println(" 🎓 Exam Seating Auto Allocator (Full-Stack Java Spring Boot)");
        System.out.println(" Web UI:       http://localhost:8080");
        System.out.println(" H2 Console:   http://localhost:8080/h2-console");
        System.out.println(" REST API:     http://localhost:8080/api/allocations");
        System.out.println("==================================================================");
    }

    /**
     * Initializes the in-memory database with default examination halls and student rosters.
     */
    @Bean
    CommandLineRunner initData(HallRepository hallRepository, 
                              StudentRepository studentRepository,
                              SeatingAllocationService allocationService) {
        return args -> {
            // Seed Halls
            if (hallRepository.count() == 0) {
                hallRepository.saveAll(Arrays.asList(
                    new Hall("HALL-101", "Main Auditorium (Room 101)", 6, 4, 2),
                    new Hall("HALL-102", "Science Block (Room 201)", 5, 4, 2),
                    new Hall("HALL-103", "Engineering Wing (Room 301)", 4, 4, 2)
                ));
                System.out.println("[INIT] Default examination halls created.");
            }

            // Seed Students
            if (studentRepository.count() == 0) {
                List<Student> sampleList = Arrays.asList(
                    new Student("21CS001", "Aarav Sharma", "CSE", 6, "CS601 - Database Systems"),
                    new Student("21CS002", "Aditi Patel", "CSE", 6, "CS601 - Database Systems"),
                    new Student("21CS003", "Rohan Verma", "CSE", 6, "CS601 - Database Systems"),
                    new Student("21CS004", "Pooja Iyer", "CSE", 6, "CS601 - Database Systems"),
                    new Student("21CS005", "Vikram Reddy", "CSE", 6, "CS601 - Database Systems"),
                    new Student("21CS006", "Sneha Deshmukh", "CSE", 6, "CS601 - Database Systems"),
                    new Student("21CS007", "Rahul Gupta", "CSE", 6, "CS601 - Database Systems"),
                    new Student("21CS008", "Ananya Choudhury", "CSE", 6, "CS601 - Database Systems"),
                    new Student("21EC001", "Amitav Sen", "ECE", 6, "EC601 - Digital Signal Processing"),
                    new Student("21EC002", "Bhavna Joshi", "ECE", 6, "EC601 - Digital Signal Processing"),
                    new Student("21EC003", "Chetan Anand", "ECE", 6, "EC601 - Digital Signal Processing"),
                    new Student("21EC004", "Deepika Pillai", "ECE", 6, "EC601 - Digital Signal Processing"),
                    new Student("21EC005", "Eshwar Rao", "ECE", 6, "EC601 - Digital Signal Processing"),
                    new Student("21EC006", "Farhan Ali", "ECE", 6, "EC601 - Digital Signal Processing"),
                    new Student("21EC007", "Geeta Nambiar", "ECE", 6, "EC601 - Digital Signal Processing"),
                    new Student("21ME001", "Pranav Bhat", "MECH", 6, "ME601 - Heat & Mass Transfer"),
                    new Student("21ME002", "Radhika Menon", "MECH", 6, "ME601 - Heat & Mass Transfer"),
                    new Student("21ME003", "Sachin Pai", "MECH", 6, "ME601 - Heat & Mass Transfer"),
                    new Student("21ME004", "Tanvi Hegde", "MECH", 6, "ME601 - Heat & Mass Transfer"),
                    new Student("21ME005", "Umesh Nayak", "MECH", 6, "ME601 - Heat & Mass Transfer"),
                    new Student("21CE001", "Devendra Rathore", "CIVIL", 6, "CE601 - Structural Analysis"),
                    new Student("21CE002", "Ekta Kapoor", "CIVIL", 6, "CE601 - Structural Analysis"),
                    new Student("21CE003", "Girish Shettigar", "CIVIL", 6, "CE601 - Structural Analysis"),
                    new Student("21CE004", "Himani Bhatt", "CIVIL", 6, "CE601 - Structural Analysis")
                );
                studentRepository.saveAll(sampleList);
                System.out.println("[INIT] Default student roster seeded (" + sampleList.size() + " students).");

                // Auto-run initial allocation
                allocationService.executeAllocation("2026-10-20", "FN", "BRANCH_ALTERNATE");
                System.out.println("[INIT] Initial seating plan auto-allocated.");
            }
        };
    }
}
