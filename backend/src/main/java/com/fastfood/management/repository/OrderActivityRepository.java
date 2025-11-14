package com.fastfood.management.repository;

import com.fastfood.management.entity.OrderActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderActivityRepository extends JpaRepository<OrderActivity, Long> {
    
    List<OrderActivity> findByOrderId(Long orderId);
    
    List<OrderActivity> findByOrderIdOrderByCreatedAtDesc(Long orderId);
}