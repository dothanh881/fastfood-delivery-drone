package com.fastfood.management.repository;

import com.fastfood.management.entity.Drone;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DroneRepository extends JpaRepository<Drone, Long> {
    java.util.List<Drone> findByStatus(Drone.DroneStatus status);
    java.util.List<Drone> findByStatusIn(java.util.List<Drone.DroneStatus> statuses);
    org.springframework.data.domain.Page<Drone> findByStatusIn(java.util.List<Drone.DroneStatus> statuses, org.springframework.data.domain.Pageable pageable);
    Page<Drone> findByStatus(Drone.DroneStatus status, Pageable pageable);
    long countByStatus(Drone.DroneStatus status);
    boolean existsBySerialIgnoreCase(String serial);
}