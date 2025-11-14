package com.fastfood.management.controller;

import com.fastfood.management.dto.request.OrderRequest;
import com.fastfood.management.dto.response.OrderCompactResponse;
import com.fastfood.management.mapper.OrderMapper;
import com.fastfood.management.dto.response.OrderResponse;
import com.fastfood.management.dto.response.DeliveryResponse;
import com.fastfood.management.entity.Order;
import com.fastfood.management.entity.User;
import com.fastfood.management.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import com.fastfood.management.service.api.OrderService;
import com.fastfood.management.service.api.DeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Map;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final UserRepository userRepository;
    private final DeliveryService deliveryService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createOrder(
            @Valid @RequestBody OrderRequest orderRequest,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        User currentUser = resolveCurrentUser(principal);
        Order order = orderService.createOrder(orderRequest, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getOrderById(@PathVariable Long id, @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        User currentUser = resolveCurrentUser(principal);
        Order order = orderService.getOrderById(id, currentUser);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> completeOrder(
            @PathVariable Long id,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        try {
            User currentUser = resolveCurrentUser(principal);
            // Lấy order và xác nhận quyền chủ đơn (đã được kiểm trong OrderService.updateOrderStatus khi set DELIVERED)
            Order order = orderService.getOrderById(id, currentUser);

            // Chỉ cho phép hoàn tất khi đơn đang ở trạng thái OUT_FOR_DELIVERY
            if (order.getStatus() != Order.OrderStatus.OUT_FOR_DELIVERY) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of(
                                "error", "BUSINESS_RULE_VIOLATION",
                                "message", "Order phải ở trạng thái OUT_FOR_DELIVERY để xác nhận hoàn tất",
                                "orderId", order.getId(),
                                "status", order.getStatus().name()
                        ));
            }

            // Nếu có delivery gắn với order, hoàn tất delivery (đồng thời set order DELIVERED ở service)
            if (order.getDelivery() != null) {
                DeliveryResponse dr = deliveryService.completeDelivery(order.getDelivery().getId());
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "orderId", order.getId(),
                        "deliveryId", dr.getId(),
                        "status", "DELIVERED"
                ));
            }

            // Nếu không có delivery, chỉ cập nhật trạng thái đơn hàng sang DELIVERED
            Order updated = orderService.updateOrderStatus(id, Order.OrderStatus.DELIVERED, currentUser);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "orderId", updated.getId(),
                    "status", "DELIVERED"
            ));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "error", "ACCESS_DENIED",
                            "message", e.getMessage()
                    ));
        } catch (jakarta.persistence.EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error", "NOT_FOUND",
                            "message", e.getMessage()
                    ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error", "BUSINESS_RULE_VIOLATION",
                            "message", e.getMessage()
                    ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error", "INVALID_REQUEST",
                            "message", e.getMessage()
                    ));
        }
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<Order>> getMyOrders(
            @RequestParam(value = "userId", required = false) Long userId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        User currentUser = resolveUser(principal, userId);
        List<Order> orders = orderService.listMyOrders(currentUser);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/me/compact")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<OrderCompactResponse>> getMyOrdersCompact(
            @RequestParam(value = "userId", required = false) Long userId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        User currentUser = resolveUser(principal, userId);
        List<Order> orders = orderService.listMyOrders(currentUser);
        List<OrderCompactResponse> response = orders.stream()
                .map(OrderMapper::toCompact)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> cancelOrder(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        User currentUser = resolveCurrentUser(principal);
        orderService.cancelOrder(id, reason, currentUser);
        return ResponseEntity.ok(Map.of("message", "Huỷ đơn hàng thành công"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('MERCHANT', 'STAFF', 'ADMIN', 'CUSTOMER')")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam("status") String status,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User principal) {
        try {
            // Đưa việc resolve user vào trong try-catch để tránh rơi vào 500
            if (principal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "error", "UNAUTHORIZED",
                                "message", "Bạn cần đăng nhập để thực hiện thao tác này"
                        ));
            }
            User currentUser = resolveCurrentUser(principal);
            String normalized = status == null ? "" : status.trim().toUpperCase();
            // Chấp nhận alias từ frontend: DELIVERING => OUT_FOR_DELIVERY, READY => READY_FOR_DELIVERY
            if ("DELIVERING".equals(normalized)) {
                normalized = "OUT_FOR_DELIVERY";
            } else if ("READY".equals(normalized)) {
                normalized = "READY_FOR_DELIVERY";
            }
            Order.OrderStatus targetStatus = Order.OrderStatus.valueOf(normalized);
            Order updatedOrder = orderService.updateOrderStatus(id, targetStatus, currentUser);
            return ResponseEntity.ok(updatedOrder);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error", "INVALID_STATUS",
                            "message", "Trạng thái không hợp lệ: " + status
                    ));
        } catch (IllegalStateException e) {
            // Các ràng buộc nghiệp vụ (ví dụ: yêu cầu PAID từ CONFIRMED trở đi)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error", "BUSINESS_RULE_VIOLATION",
                            "message", e.getMessage()
                    ));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "error", "ACCESS_DENIED",
                            "message", e.getMessage()
                    ));
        } catch (jakarta.persistence.EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error", "NOT_FOUND",
                            "message", e.getMessage()
                    ));
        } catch (Exception e) {
            // Tránh rơi vào 500 do GlobalExceptionHandler với lỗi chung
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error", "INVALID_REQUEST",
                            "message", e.getMessage()
                    ));
        }
    }

    // Merchant view: list orders by status with pagination
    @GetMapping("/status")
    @PreAuthorize("hasAnyRole('MERCHANT', 'STAFF', 'ADMIN')")
    public ResponseEntity<Page<OrderResponse>> getOrdersByStatus(
            @RequestParam("status") String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "storeId", required = false) Long storeId) {
        Order.OrderStatus queryStatus = Order.OrderStatus.valueOf(status.toUpperCase());
        Page<OrderResponse> orders = orderService.getOrdersByStatus(queryStatus, PageRequest.of(page, size), code, storeId);
        return ResponseEntity.ok(orders);
    }

    // Stats endpoint for merchant dashboard
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('MERCHANT', 'STAFF', 'ADMIN')")
    public ResponseEntity<?> getOrderStats(
            @RequestParam(value = "storeId", required = false) Long storeId,
            @RequestParam(value = "start", required = false) String start,
            @RequestParam(value = "end", required = false) String end) {
        try {
            LocalDateTime startDt = null;
            LocalDateTime endDt = null;
            if (start != null && !start.isBlank()) {
                // Accept either ISO LocalDate or ISO LocalDateTime
                try {
                    startDt = LocalDate.parse(start).atStartOfDay();
                } catch (DateTimeParseException ex) {
                    startDt = LocalDateTime.parse(start);
                }
            }
            if (end != null && !end.isBlank()) {
                try {
                    endDt = LocalDate.parse(end).atTime(23, 59, 59);
                } catch (DateTimeParseException ex) {
                    endDt = LocalDateTime.parse(end);
                }
            }
            var stats = orderService.getOrderStats(storeId, startDt, endDt);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error", "INVALID_PARAMS",
                            "message", e.getMessage()
                    ));
        }
    }
    private User resolveCurrentUser(org.springframework.security.core.userdetails.User principal) {
        if (principal == null) {
            throw new EntityNotFoundException("Authenticated principal not found");
        }
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }

    private User resolveUser(org.springframework.security.core.userdetails.User principal, Long userId) {
        if (userId != null) {
            return userRepository.findById(userId)
                    .orElseThrow(() -> new EntityNotFoundException("User not found"));
        }
        return resolveCurrentUser(principal);
    }
}