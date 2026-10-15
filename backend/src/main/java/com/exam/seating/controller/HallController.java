package com.exam.seating.controller;

import com.exam.seating.model.Hall;
import com.exam.seating.repository.AllocationRepository;
import com.exam.seating.repository.HallRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/halls")
@CrossOrigin(origins = "*")
public class HallController {

    @Autowired
    private HallRepository hallRepository;

    @Autowired
    private AllocationRepository allocationRepository;

    @GetMapping
    public List<Hall> getAllHalls() {
        return hallRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createHall(@RequestBody Hall hall) {
        if (hall.getId() == null || hall.getId().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Hall ID cannot be empty");
        }
        hall.setId(hall.getId().trim().toUpperCase());
        if (hall.getSeatsPerBench() <= 0) hall.setSeatsPerBench(2);
        hall.setCapacity(hall.getRows() * hall.getCols() * hall.getSeatsPerBench());
        
        Hall saved = hallRepository.save(hall);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> createHallsBulk(@RequestBody List<Hall> halls) {
        if (halls == null || halls.isEmpty()) {
            return ResponseEntity.badRequest().body("Halls list cannot be empty");
        }
        for (Hall hall : halls) {
            if (hall.getId() != null) hall.setId(hall.getId().trim().toUpperCase());
            if (hall.getSeatsPerBench() <= 0) hall.setSeatsPerBench(2);
            hall.setCapacity(hall.getRows() * hall.getCols() * hall.getSeatsPerBench());
        }
        List<Hall> saved = hallRepository.saveAll(halls);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteHall(@PathVariable String id) {
        allocationRepository.deleteByHallId(id);
        hallRepository.deleteById(id);
        return ResponseEntity.ok("Hall " + id + " deleted.");
    }
}
