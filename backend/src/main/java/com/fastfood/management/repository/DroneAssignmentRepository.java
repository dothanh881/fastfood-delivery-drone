package com.fastfood.management.repository;

import com.fastfood.management.entity.DroneAssignment;
import com.fastfood.management.entity.Drone;
import com.fastfood.management.entity.Delivery;
import com.fastfood.management.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DroneAssignmentRepository extends JpaRepository<DroneAssignment, Long> {
    
    Optional<DroneAssignment> findByOrder(Order order);
    
    @Query("SELECT da FROM DroneAssignment da WHERE da.order.id = :orderId")
    Optional<DroneAssignment> findByOrderId(Long orderId);
    
    @Query("SELECT da FROM DroneAssignment da WHERE da.drone.id = :droneId AND da.completedAt IS NULL")
    Optional<DroneAssignment> findActiveAssignmentByDroneId(Long droneId);

    // Prefer this derived query to avoid NonUniqueResultException when multiple active assignments exist
    Optional<DroneAssignment> findTopByDroneIdAndCompletedAtIsNullOrderByAssignedAtDesc(Long droneId);
    
    List<DroneAssignment> findByDroneAndCompletedAtIsNotNull(Drone drone);
    
    List<DroneAssignment> findByCompletedAtIsNull();
    
    List<DroneAssignment> findByDroneAndCompletedAtIsNull(Drone drone);
    
    List<DroneAssignment> findByDelivery(Delivery delivery);
}