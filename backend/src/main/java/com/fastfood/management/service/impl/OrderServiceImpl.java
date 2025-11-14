package com.fastfood.management.service.impl;

import com.fastfood.management.dto.request.OrderRequest;
import com.fastfood.management.dto.response.OrderResponse;
import com.fastfood.management.entity.*;
import com.fastfood.management.repository.*;
import java.util.UUID;
import com.fastfood.management.service.api.OrderService;
import com.fastfood.management.service.api.FleetService;
import com.fastfood.management.service.impl.WebSocketService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final MenuItemRepository menuItemRepository;
    private final AddressRepository addressRepository;
    private final OrderActivityRepository orderActivityRepository;
    private final PaymentRepository paymentRepository;
    private final DeliveryRepository deliveryRepository;
    private final WebSocketService webSocketService;
    private final FleetService fleetService;

    @Override
    @Transactional
    public Order createOrder(OrderRequest orderRequest, User currentUser) {
        // Validate address
        Address address = addressRepository.findById(orderRequest.getAddressId())
                .orElseThrow(() -> new EntityNotFoundException("Address not found"));
        
        // Determine store from first menu item and validate all items belong to same store
        if (orderRequest.getItems() == null || orderRequest.getItems().isEmpty()) {
            throw new IllegalArgumentException("Order must contain at least one item");
        }
        MenuItem firstMenuItem = menuItemRepository.findById(orderRequest.getItems().get(0).getMenuItemId())
                .orElseThrow(() -> new EntityNotFoundException("Menu item not found"));
        Store store = firstMenuItem.getStore();
        if (store == null) {
            throw new IllegalStateException("Menu item does not belong to a store");
        }

        // Create order
        Order order = Order.builder()
                .customer(currentUser)
                .store(store)
                .status(Order.OrderStatus.CREATED)
                .totalAmount(BigDecimal.ZERO)
                .paymentMethod(Order.PaymentMethod.valueOf(orderRequest.getPaymentMethod()))
                .paymentStatus(Order.PaymentStatus.PENDING)
                .address(address)
                .note(orderRequest.getNote())
                .build();
        
        order = orderRepository.save(order);

        // Generate order code: ORD-YYYYMMDD-ID
        java.time.LocalDate today = java.time.LocalDate.now();
        String datePart = today.format(java.time.format.DateTimeFormatter.BASIC_ISO_DATE);
        String code = "ORD-" + datePart + "-" + order.getId();
        order.setOrderCode(code);
        order = orderRepository.save(order);
        
        // tạo order, tính total 
        BigDecimal totalAmount = BigDecimal.ZERO;
        Map<Long, Integer> menuItemQuantities = new HashMap<>();
        
        for (OrderRequest.OrderItemRequest itemRequest : orderRequest.getItems()) {
            MenuItem menuItem = menuItemRepository.findById(itemRequest.getMenuItemId())
                    .orElseThrow(() -> new EntityNotFoundException("Menu item not found"));
            // check trạng thái (có sẳn) có bật hay không
            if (!menuItem.isAvailable()) {
                throw new IllegalStateException("Menu item " + menuItem.getName() + " is not available");
            }
            if (menuItem.getStore() == null || !menuItem.getStore().getId().equals(store.getId())) {
                throw new IllegalStateException("All items in an order must belong to the same store");
            }
            
            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(menuItem.getPrice())
                    .nameSnapshot(menuItem.getName())
                    .imageSnapshot(menuItem.getImageUrl())
                    .build();
            
            orderItemRepository.save(orderItem);
            
            totalAmount = totalAmount.add(menuItem.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity())));
            menuItemQuantities.put(menuItem.getId(), itemRequest.getQuantity());
        }
        
        // Update order total
        order.setTotalAmount(totalAmount);
        order = orderRepository.save(order);

        // Auto insert payment record based on payment method
        insertPaymentForOrder(order);

        // KHÔNG tạo Delivery lúc tạo đơn; sẽ tạo khi đơn READY_FOR_DELIVERY

        // Create order activity
        OrderActivity activity = OrderActivity.builder()
                .order(order)
                .fromStatus(Order.OrderStatus.CREATED)
                .toStatus(Order.OrderStatus.CREATED)
                .reason("Order created")
                .build();
        orderActivityRepository.save(activity);
        
        // 
        // webSocketService.sendOrderStatusUpdate(order.getId(), order.getStatus().name());
        
        return order;
    }

    private void insertPaymentForOrder(Order order) {
        if (order.getPaymentMethod() == Order.PaymentMethod.VNPAY || order.getPaymentMethod() == Order.PaymentMethod.WALLET) {
            String provider = order.getPaymentMethod() == Order.PaymentMethod.VNPAY ? "VNPAY" : "WALLET";
            Payment payment = Payment.builder()
                    .order(order)
                    .provider(provider)
                    .amount(order.getTotalAmount())
                    .transactionReference("ORD-" + order.getId() + "-" + UUID.randomUUID().toString().substring(0, 8))
                    .status(Payment.PaymentStatus.PENDING)
                    .build();
            paymentRepository.save(payment);
        }
    }

    private void insertDeliveryForOrder(Order order) {
        Delivery delivery = Delivery.builder()
                .order(order)
                .status(Delivery.DeliveryStatus.PENDING)
                .destLat(order.getAddress() != null ? order.getAddress().getLat() : null)
                .destLng(order.getAddress() != null ? order.getAddress().getLng() : null)
                .build();
        delivery = deliveryRepository.save(delivery);
        order.setDelivery(delivery);
        orderRepository.save(order);
    }

    @Override
    @Transactional
    public Order updateOrderStatus(Long id, Order.OrderStatus status, User currentUser) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
        
        Order.OrderStatus oldStatus = order.getStatus();

        // RBAC: Cho phép MERCHANT, STAFF hoặc ADMIN thao tác các trạng thái vận hành bếp/giao hàng
        boolean isAdmin = hasSystemRole(currentUser, Role.ROLE_ADMIN);
        boolean isMerchant = hasSystemRole(currentUser, Role.ROLE_MERCHANT);
        boolean isStaff = hasSystemRole(currentUser, Role.ROLE_STAFF);
        boolean isOwner = currentUser != null && order.getCustomer() != null && order.getCustomer().getId().equals(currentUser.getId());

        switch (status) {
            case CONFIRMED:
            case PREPARING:
            case READY_FOR_DELIVERY:
            case REJECTED:
                if (!(isAdmin || isMerchant || isStaff)) {
                    throw new IllegalStateException("Chỉ nhân viên cửa hàng hoặc admin mới được cập nhật trạng thái bếp");
                }
                break;
            case ASSIGNED:
            case OUT_FOR_DELIVERY:
                if (!isAdmin) {
                    throw new IllegalStateException("Chỉ admin/hệ thống được cập nhật trạng thái giao hàng (ASSIGNED/OUT_FOR_DELIVERY)");
                }
                break;
            case DELIVERED:
                // Cho phép chủ đơn xác nhận hoàn thành sau khi giao xong
                if (!(isOwner || isAdmin)) {
                    throw new IllegalStateException("Chỉ khách hàng chủ đơn hoặc admin được phép xác nhận hoàn thành (DELIVERED)");
                }
                break;
            case CANCELLED:
                // Cho phép chủ đơn hủy, hoặc admin/merchant
                if (!(isOwner || isAdmin || isMerchant)) {
                    throw new IllegalStateException("Bạn không có quyền hủy đơn này");
                }
                break;
            default:
                break;
        }

        // Ràng buộc thanh toán: từ CONFIRMED trở đi phải PAID
        if ((status == Order.OrderStatus.CONFIRMED ||
             status == Order.OrderStatus.PREPARING ||
             status == Order.OrderStatus.READY_FOR_DELIVERY ||
             status == Order.OrderStatus.ASSIGNED ||
             status == Order.OrderStatus.OUT_FOR_DELIVERY ||
             status == Order.OrderStatus.DELIVERED)
            && order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            throw new IllegalStateException("Đơn chưa thanh toán (PAID), không thể chuyển trạng thái");
        }
        
        // Nếu xác nhận DELIVERED từ OUT_FOR_DELIVERY: yêu cầu chờ tối thiểu 3 giây
        if (status == Order.OrderStatus.DELIVERED && oldStatus == Order.OrderStatus.OUT_FOR_DELIVERY) {
            java.time.LocalDateTime outForDeliveryAt = null;
            java.util.List<OrderActivity> activitiesDesc = orderActivityRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());
            for (OrderActivity a : activitiesDesc) {
                if (a.getToStatus() == Order.OrderStatus.OUT_FOR_DELIVERY) {
                    outForDeliveryAt = a.getCreatedAt();
                    break;
                }
            }
            if (outForDeliveryAt == null) {
                outForDeliveryAt = order.getUpdatedAt();
            }
            if (outForDeliveryAt != null) {
                long elapsed = java.time.Duration.between(outForDeliveryAt, java.time.LocalDateTime.now()).getSeconds();
                if (elapsed < 3) {
                    throw new IllegalStateException("Vui lòng đợi 3 giây trước khi xác nhận hoàn thành đơn hàng");
                }
            }
        }

        // Validate status transition
        validateStatusTransition(oldStatus, status);
        
        // Update order status
        order.setStatus(status);
        order = orderRepository.save(order);

        // Create order activity
        OrderActivity activity = OrderActivity.builder()
                .order(order)
                .actor(currentUser)
                .fromStatus(oldStatus)
                .toStatus(status)
                .build();
        orderActivityRepository.save(activity);

        // Khi READY_FOR_DELIVERY: tự động gán drone và bỏ qua ASSIGNED -> chuyển thẳng OUT_FOR_DELIVERY.
        if (status == Order.OrderStatus.READY_FOR_DELIVERY) {
            Optional<DroneAssignment> assignmentOpt = fleetService.autoAssignDrone(order);
            if (assignmentOpt.isEmpty()) {
                // Không có drone rảnh: tạo delivery PENDING để UI theo dõi
                if (order.getDelivery() == null) {
                    insertDeliveryForOrder(order);
                }
            } else {
                // Có drone: cập nhật order và delivery ngay lập tức
                Order.OrderStatus prev = order.getStatus();
                order.setStatus(Order.OrderStatus.OUT_FOR_DELIVERY);
                order = orderRepository.save(order);

                Delivery delivery = order.getDelivery();
                if (delivery != null) {
                    delivery.setStatus(Delivery.DeliveryStatus.IN_PROGRESS);
                    delivery.setSegmentStartTime(java.time.LocalDateTime.now());
                    deliveryRepository.save(delivery);
                }

                // Ghi lại activity cho chuyển trạng thái tự động
                OrderActivity autoActivity = OrderActivity.builder()
                        .order(order)
                        .actor(currentUser)
                        .fromStatus(prev)
                        .toStatus(Order.OrderStatus.OUT_FOR_DELIVERY)
                        .build();
                orderActivityRepository.save(autoActivity);
            }
        }
        
        // Khi DELIVERED: hoàn thành assignment và đưa drone về IDLE
        if (status == Order.OrderStatus.DELIVERED) {
            // Tìm delivery của order này
            Delivery delivery = order.getDelivery();
            if (delivery != null && delivery.getDrone() != null) {
                // Cập nhật delivery status
                delivery.setStatus(Delivery.DeliveryStatus.COMPLETED);
                deliveryRepository.save(delivery);
                
                // Hoàn thành assignment và đưa drone về IDLE
                final Drone drone = delivery.getDrone();
                final Long orderId = order.getId();
                fleetService.getCurrentAssignment(drone.getId()).ifPresent(assignment -> {
                    fleetService.completeAssignment(assignment.getId());
                    log.info("Completed assignment for drone {} when order {} marked as DELIVERED", 
                            drone.getId(), orderId);
                });
            }
        }
        
        // Gửi WebSocket notification cho realtime order tracking (trạng thái cuối cùng sau auto-assign nếu có)
        try {
            webSocketService.sendOrderStatusUpdate(order.getId(), order.getStatus().name());
        } catch (Exception e) {
            // Không để thất bại WebSocket làm hỏng luồng cập nhật trạng thái
            log.warn("WebSocket send failed for order {}: {}", order.getId(), e.getMessage());
        }
        
        return order;
    }

    @Override
    @Transactional
    public void cancelOrder(Long id, String reason, User currentUser) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
        
        // Check if user has access to this order
        if (currentUser == null || order.getCustomer() == null || !order.getCustomer().getId().equals(currentUser.getId())) {
            throw new IllegalStateException("Access denied: Order does not belong to current user");
        }
        
        // Check if order can be cancelled: only before READY_FOR_DELIVERY
        if (!(order.getStatus() == Order.OrderStatus.CREATED ||
              order.getStatus() == Order.OrderStatus.CONFIRMED ||
              order.getStatus() == Order.OrderStatus.PREPARING)) {
            throw new IllegalStateException("Order cannot be cancelled in current status");
        }
        
        // Update order status
        Order.OrderStatus oldStatus = order.getStatus();
        order.setStatus(Order.OrderStatus.CANCELLED);
        orderRepository.save(order);
        
        // Create order activity
        OrderActivity activity = OrderActivity.builder()
                .order(order)
                .fromStatus(oldStatus)
                .toStatus(Order.OrderStatus.CANCELLED)
                .build();
        orderActivityRepository.save(activity);
        
        // Gửi WebSocket notification cho realtime order tracking
        try {
            webSocketService.sendOrderStatusUpdate(order.getId(), order.getStatus().name());
        } catch (Exception e) {
            log.warn("WebSocket send failed for order {}: {}", order.getId(), e.getMessage());
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public Order getOrderById(Long id, User currentUser) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));
        
        // Allow owner or system roles to view order
        boolean isOwner = currentUser != null && order.getCustomer() != null && order.getCustomer().getId().equals(currentUser.getId());
        boolean hasAdmin = hasSystemRole(currentUser, "ADMIN") || hasSystemRole(currentUser, "ROLE_ADMIN");
        boolean hasMerchant = hasSystemRole(currentUser, "MERCHANT") || hasSystemRole(currentUser, "ROLE_MERCHANT");
        boolean hasStaff = hasSystemRole(currentUser, "STAFF") || hasSystemRole(currentUser, "ROLE_STAFF");
        boolean hasManager = hasSystemRole(currentUser, "MANAGER") || hasSystemRole(currentUser, "ROLE_MANAGER");
        
        if (!(isOwner || hasAdmin || hasMerchant || hasStaff || hasManager)) {
            throw new AccessDeniedException("Access denied: not permitted to view this order");
        }

        // Initialize lazy collections for serialization
        if (order.getOrderItems() != null) {
            order.getOrderItems().size();
        }
        return order;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Order> listMyOrders(User currentUser) {
        List<Order> orders = orderRepository.findByCustomerOrderByCreatedAtDesc(currentUser);
        // Initialize lazy collections to avoid LazyInitializationException during JSON serialization
        for (Order order : orders) {
            if (order.getOrderItems() != null) {
                order.getOrderItems().size();
            }
        }
        return orders;
    }

    @Override
    public Page<OrderResponse> getOrdersByStatus(Order.OrderStatus status, Pageable pageable) {
        Page<Order> orders = orderRepository.findByStatus(status, pageable);
        return orders.map(this::mapOrderToResponse);
    }

    @Override
    public Page<OrderResponse> getOrdersByStatus(Order.OrderStatus status, Pageable pageable, String code) {
        if (code != null && !code.trim().isEmpty()) {
            java.util.Optional<Order> opt = orderRepository.findByOrderCode(code.trim());
            java.util.List<Order> list = opt.map(java.util.List::of).orElse(java.util.List.of());
            org.springframework.data.domain.Page<Order> page = new org.springframework.data.domain.PageImpl<>(list, pageable, list.size());
            return page.map(this::mapOrderToResponse);
        }
        return getOrdersByStatus(status, pageable);
    }

    @Override
    public Page<OrderResponse> getOrdersByStatus(Order.OrderStatus status, Pageable pageable, String code, Long storeId) {
        if (code != null && !code.trim().isEmpty()) {
            java.util.Optional<Order> opt = orderRepository.findByOrderCode(code.trim());
            java.util.List<Order> list = opt.map(java.util.List::of).orElse(java.util.List.of());
            org.springframework.data.domain.Page<Order> page = new org.springframework.data.domain.PageImpl<>(list, pageable, list.size());
            return page.map(this::mapOrderToResponse);
        }
        if (storeId != null) {
            Page<Order> orders = orderRepository.findByStoreIdAndStatus(storeId, status, pageable);
            return orders.map(this::mapOrderToResponse);
        }
        return getOrdersByStatus(status, pageable);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public com.fastfood.management.dto.response.OrderStatsResponse getOrderStats(Long storeId, java.time.LocalDateTime start, java.time.LocalDateTime end) {
        java.util.List<Order.OrderStatus> processingStatuses = java.util.Arrays.asList(
                Order.OrderStatus.CREATED,
                Order.OrderStatus.CONFIRMED,
                Order.OrderStatus.PREPARING,
                Order.OrderStatus.READY_FOR_DELIVERY,
                Order.OrderStatus.ASSIGNED,
                Order.OrderStatus.OUT_FOR_DELIVERY
        );
        java.util.List<Order.OrderStatus> deliveredStatuses = java.util.Arrays.asList(Order.OrderStatus.DELIVERED);
        java.util.List<Order.OrderStatus> cancelledStatuses = java.util.Arrays.asList(
                Order.OrderStatus.CANCELLED,
                Order.OrderStatus.REJECTED,
                Order.OrderStatus.FAILED
        );

        java.math.BigDecimal totalRevenue = orderRepository.sumTotalAmountByStatusAndStore(storeId, deliveredStatuses, start, end);
        long processingCount = orderRepository.countByStatusAndStore(storeId, processingStatuses, start, end);
        long deliveredCount = orderRepository.countByStatusAndStore(storeId, deliveredStatuses, start, end);
        long cancelledCount = orderRepository.countByStatusAndStore(storeId, cancelledStatuses, start, end);

        return com.fastfood.management.dto.response.OrderStatsResponse.builder()
                .storeId(storeId)
                .start(start)
                .end(end)
                .totalRevenue(totalRevenue != null ? totalRevenue : java.math.BigDecimal.ZERO)
                .processingCount(processingCount)
                .deliveredCount(deliveredCount)
                .cancelledCount(cancelledCount)
                .build();
    }

    // Helper methods
    
    private void validateStatusTransition(Order.OrderStatus currentStatus, Order.OrderStatus newStatus) {

        switch (currentStatus) {
            case CREATED:
                if (newStatus != Order.OrderStatus.CONFIRMED &&
                    newStatus != Order.OrderStatus.REJECTED &&
                    newStatus != Order.OrderStatus.CANCELLED) {
                    throw new IllegalStateException("Invalid status transition");
                }
                break;
            case CONFIRMED:
                if (newStatus != Order.OrderStatus.PREPARING &&
                    newStatus != Order.OrderStatus.REJECTED &&
                    newStatus != Order.OrderStatus.CANCELLED) {
                    throw new IllegalStateException("Invalid status transition");
                }
                break;
            case PREPARING:
                if (newStatus != Order.OrderStatus.READY_FOR_DELIVERY &&
                    newStatus != Order.OrderStatus.REJECTED &&
                    newStatus != Order.OrderStatus.CANCELLED) {
                    throw new IllegalStateException("Invalid status transition");
                }
                break;
            case READY_FOR_DELIVERY:
                if (newStatus != Order.OrderStatus.ASSIGNED && newStatus != Order.OrderStatus.OUT_FOR_DELIVERY) {
                    throw new IllegalStateException("Invalid status transition");
                }
                break;
            case ASSIGNED:
                if (newStatus != Order.OrderStatus.OUT_FOR_DELIVERY) {
                    throw new IllegalStateException("Invalid status transition");
                }
                break;
            case OUT_FOR_DELIVERY:
                if (newStatus != Order.OrderStatus.DELIVERED && newStatus != Order.OrderStatus.FAILED) {
                    throw new IllegalStateException("Invalid status transition");
                }
                break;
            case DELIVERED:
            case REJECTED:
            case CANCELLED:
            case FAILED:
                throw new IllegalStateException("Cannot change status of a terminal state");
            default:
                throw new IllegalStateException("Unknown order status");
        }
    }

    private boolean hasSystemRole(User user, String code) {
        if (user == null || user.getRoles() == null) return false;
        return user.getRoles().stream().anyMatch(r -> code.equals(r.getCode()));
    }
    
    private User getCurrentUser() {
        // In a real implementation, this would use SecurityContextHolder
        // For now, return null as a placeholder
        return null;
    }
    
    private OrderResponse mapOrderToResponse(Order order) {
        // In a real implementation, this would use MapStruct
        // For now, return a simple implementation
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setOrderCode(order.getOrderCode());
        response.setStatus(order.getStatus().name());
        response.setTotalAmount(order.getTotalAmount());
        response.setPaymentMethod(order.getPaymentMethod().name());
        response.setPaymentStatus(order.getPaymentStatus().name());
        response.setCreatedAt(order.getCreatedAt());
        return response;
    }
}