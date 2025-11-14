package com.fastfood.management.repository;

import com.fastfood.management.entity.Delivery;
import com.fastfood.management.entity.DeliveryEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface DeliveryEventRepository extends JpaRepository<DeliveryEvent, Long> {
    
    List<DeliveryEvent> findByDelivery(Delivery delivery);
    
    List<DeliveryEvent> findByDeliveryOrderByTsDesc(Delivery delivery);
    
    @Query("SELECT de FROM DeliveryEvent de WHERE de.delivery.id = :deliveryId ORDER BY de.ts DESC")
    List<DeliveryEvent> findByDeliveryIdOrderByTsDesc(@Param("deliveryId") Long deliveryId);
    
    List<DeliveryEvent> findByEventType(DeliveryEvent.EventType eventType);
    
    List<DeliveryEvent> findByDeliveryAndTsBetween(Delivery delivery, LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT de FROM DeliveryEvent de WHERE de.delivery.id = :deliveryId AND de.ts >= :since ORDER BY de.ts DESC")
    List<DeliveryEvent> findRecentEventsByDeliveryId(@Param("deliveryId") Long deliveryId, @Param("since") LocalDateTime since);
}