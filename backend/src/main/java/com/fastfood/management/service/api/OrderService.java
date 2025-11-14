package com.fastfood.management.service.api;

import com.fastfood.management.dto.request.OrderRequest;
import com.fastfood.management.dto.response.OrderResponse;
import com.fastfood.management.dto.response.OrderStatsResponse;
import com.fastfood.management.entity.Order;
import com.fastfood.management.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.time.LocalDateTime;

public interface OrderService {
    Order createOrder(OrderRequest orderRequest, User currentUser);
    Order getOrderById(Long id, User currentUser);
    List<Order> listMyOrders(User currentUser);
    Page<OrderResponse> getOrdersByStatus(Order.OrderStatus status, Pageable pageable);
    Page<OrderResponse> getOrdersByStatus(Order.OrderStatus status, Pageable pageable, String code);
    Page<OrderResponse> getOrdersByStatus(Order.OrderStatus status, Pageable pageable, String code, Long storeId);
    Order updateOrderStatus(Long id, Order.OrderStatus status, User currentUser);
    void cancelOrder(Long id, String reason, User currentUser);

    OrderStatsResponse getOrderStats(Long storeId, LocalDateTime start, LocalDateTime end);
}