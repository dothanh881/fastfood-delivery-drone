package com.fastfood.management.repository;

import com.fastfood.management.entity.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    
    List<Feedback> findByOrderId(Long orderId);
    
    List<Feedback> findByMenuItemId(Long menuItemId);
    
    Page<Feedback> findByCustomerId(Long customerId, Pageable pageable);
    
    Page<Feedback> findByRatingGreaterThanEqual(Integer minRating, Pageable pageable);
}