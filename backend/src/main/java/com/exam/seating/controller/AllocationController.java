package com.exam.seating.controller;

import com.exam.seating.model.Allocation;
import com.exam.seating.model.AllocationRequest;
import com.exam.seating.repository.AllocationRepository;
import com.exam.seating.service.SeatingAllocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/allocations")
@CrossOrigin(origins = "*")
public class AllocationController {

    @Autowired
    private AllocationRepository allocationRepository;

    @Autowired
    private SeatingAllocationService allocationService;

    @GetMapping
    public List<Allocation> getAllAllocations() {
        return allocationRepository.findAll();
    }

    @PostMapping("/run")
    public ResponseEntity<?> runAutoAllocation(@RequestBody(required = false) AllocationRequest request) {
        if (request == null) {
            request = new AllocationRequest();
        }
        try {
            List<Allocation> results = allocationService.executeAllocation(
                    request.getDate(),
                    request.getSession(),
                    request.getInterleaveStrategy()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Seating auto-allocation generated successfully!");
            response.put("totalAllocated", results.size());
            response.put("allocations", results);
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/hall/{hallId}")
    public List<Allocation> getByHall(@PathVariable String hallId) {
        return allocationRepository.findByHallId(hallId);
    }

    @GetMapping("/student/{rollNo}")
    public ResponseEntity<?> getByStudentRoll(@PathVariable String rollNo) {
        Optional<Allocation> alloc = allocationRepository.findByStudentRoll(rollNo.trim().toUpperCase());
        if (alloc.isPresent()) {
            return ResponseEntity.ok(alloc.get());
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearAllAllocations() {
        allocationRepository.deleteAll();
        return ResponseEntity.ok("All allocations cleared.");
    }
}
