package com.fastfood.management.repository;

import com.fastfood.management.entity.Order;
import com.fastfood.management.entity.OrderItem;
import com.fastfood.management.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    
    List<OrderItem> findByOrder(Order order);
    
    List<OrderItem> findByMenuItem(MenuItem menuItem);
    
    @Query("SELECT oi FROM OrderItem oi WHERE oi.order.id = :orderId")
    List<OrderItem> findByOrderId(@Param("orderId") Long orderId);
    
    @Query("SELECT SUM(oi.quantity) FROM OrderItem oi WHERE oi.menuItem.id = :menuItemId")
    Long getTotalQuantityByMenuItem(@Param("menuItemId") Long menuItemId);
}