package com.fastfood.management.repository;

import com.fastfood.management.entity.Order;
import com.fastfood.management.entity.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByCustomer(User customer, Pageable pageable);
    Page<Order> findByStatus(Order.OrderStatus status, Pageable pageable);
    Page<Order> findByStoreIdAndStatus(Long storeId, Order.OrderStatus status, Pageable pageable);
    List<Order> findByStatusAndCreatedAtBefore(Order.OrderStatus status, LocalDateTime time);
    List<Order> findByCustomerAndCreatedAtBetween(User customer, LocalDateTime start, LocalDateTime end);
    List<Order> findByCustomerOrderByCreatedAtDesc(User customer);
    java.util.Optional<Order> findByOrderCode(String orderCode);

    @Query("select coalesce(sum(o.totalAmount), 0) from Order o " +
            "where (:storeId is null or o.store.id = :storeId) " +
            "and o.status in :statuses " +
            "and (:start is null or o.createdAt >= :start) " +
            "and (:end is null or o.createdAt <= :end)")
    BigDecimal sumTotalAmountByStatusAndStore(
            @Param("storeId") Long storeId,
            @Param("statuses") List<Order.OrderStatus> statuses,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    @Query("select count(o) from Order o " +
            "where (:storeId is null or o.store.id = :storeId) " +
            "and o.status in :statuses " +
            "and (:start is null or o.createdAt >= :start) " +
            "and (:end is null or o.createdAt <= :end)")
    long countByStatusAndStore(
            @Param("storeId") Long storeId,
            @Param("statuses") List<Order.OrderStatus> statuses,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}