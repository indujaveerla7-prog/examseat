package com.exam.seating.repository;

import com.exam.seating.model.Allocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AllocationRepository extends JpaRepository<Allocation, Long> {
    List<Allocation> findByHallId(String hallId);
    Optional<Allocation> findByStudentRoll(String studentRoll);
    void deleteByHallId(String hallId);
}
