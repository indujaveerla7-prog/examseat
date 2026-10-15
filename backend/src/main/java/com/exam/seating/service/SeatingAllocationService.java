package com.exam.seating.service;

import com.exam.seating.model.Allocation;
import com.exam.seating.model.Hall;
import com.exam.seating.model.Student;
import com.exam.seating.repository.AllocationRepository;
import com.exam.seating.repository.HallRepository;
import com.exam.seating.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class SeatingAllocationService {

    @Autowired
    private HallRepository hallRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AllocationRepository allocationRepository;

    /**
     * Executes the Auto-Allocation process using an anti-cheating interleaved algorithm.
     */
    @Transactional
    public List<Allocation> executeAllocation(String examDate, String examSession, String strategy) {
        List<Hall> halls = hallRepository.findAll();
        List<Student> students = studentRepository.findAll();

        if (halls.isEmpty() || students.isEmpty()) {
            throw new IllegalStateException("Halls and registered students are required before running allocation.");
        }

        // Clear any previous allocation
        allocationRepository.deleteAll();

        // 1. Group students by branch
        Map<String, List<Student>> branchGroups = new LinkedHashMap<>();
        for (Student s : students) {
            branchGroups.computeIfAbsent(s.getBranch(), k -> new ArrayList<>()).add(s);
        }

        // 2. Interleave students across branches (Round-robin queue)
        List<Student> interleavedQueue = new ArrayList<>();
        if ("BRANCH_ALTERNATE".equalsIgnoreCase(strategy) && branchGroups.size() > 1) {
            List<List<Student>> queues = new ArrayList<>();
            for (List<Student> list : branchGroups.values()) {
                queues.add(new ArrayList<>(list));
            }

            boolean hasMore = true;
            while (hasMore) {
                hasMore = false;
                for (List<Student> q : queues) {
                    if (!q.isEmpty()) {
                        interleavedQueue.add(q.remove(0));
                        if (!q.isEmpty()) hasMore = true;
                    }
                }
            }
        } else {
            interleavedQueue.addAll(students);
        }

        // 3. Assign to Halls -> Benches -> Seats
        List<Allocation> results = new ArrayList<>();
        int studentIdx = 0;
        int totalStudents = interleavedQueue.size();

        for (Hall hall : halls) {
            int seatsPerBench = hall.getSeatsPerBench() > 0 ? hall.getSeatsPerBench() : 2;

            for (int r = 1; r <= hall.getRows(); r++) {
                for (int c = 1; c <= hall.getCols(); c++) {
                    for (int pos = 0; pos < seatsPerBench; pos++) {
                        if (studentIdx >= totalStudents) {
                            allocationRepository.saveAll(results);
                            return results;
                        }

                        Student student = interleavedQueue.get(studentIdx);
                        String posChar = (pos == 0) ? "L" : "R";
                        String seatPos = (pos == 0) ? "A" : "B";
                        String seatLabel = hall.getId() + "-R" + r + "C" + c + "-" + posChar;
                        String benchLabel = "Row " + r + ", Col " + c;

                        Allocation alloc = new Allocation(
                                seatLabel,
                                hall.getId(),
                                hall.getName(),
                                r,
                                c,
                                seatPos,
                                benchLabel,
                                student.getRollNo(),
                                student.getName(),
                                student.getBranch(),
                                student.getSubject(),
                                examDate != null ? examDate : "2026-10-20",
                                examSession != null ? examSession : "FN"
                        );

                        results.add(alloc);
                        studentIdx++;
                    }
                }
            }
        }

        return allocationRepository.saveAll(results);
    }
}
