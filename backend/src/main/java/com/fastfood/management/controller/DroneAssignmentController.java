package com.fastfood.management.controller;

import com.fastfood.management.entity.Delivery;
import com.fastfood.management.entity.Drone;
import com.fastfood.management.entity.DroneAssignment;
import com.fastfood.management.entity.Order;
import com.fastfood.management.repository.DeliveryRepository;
import com.fastfood.management.repository.DroneRepository;
import com.fastfood.management.repository.OrderRepository;
import com.fastfood.management.service.api.FleetService;
import com.fastfood.management.service.api.DroneSimulator;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/drone/assignments")
@RequiredArgsConstructor
public class DroneAssignmentController {

    private final FleetService fleetService;
    private final OrderRepository orderRepository;
    private final DeliveryRepository deliveryRepository;
    private final DroneRepository droneRepository;
    private final DroneSimulator droneSimulator;

    @PostMapping("/auto")
    @PreAuthorize("hasAnyRole('ADMIN','MERCHANT','STAFF')")
    public ResponseEntity<?> autoAssign(@RequestBody(required = false) Map<String, Object> payload) {
        // Đơn giản hóa demo: payload có thể bỏ trống. Nếu không có orderId, chọn đơn READY_FOR_DELIVERY cũ nhất.
        Long orderId = null;
        String orderCode = null;
        if (payload != null) {
            Object oid = payload.get("orderId");
            if (oid != null) {
                try {
                    // Hỗ trợ số hoặc chuỗi số; bỏ qua nếu không phải số
                    String s = String.valueOf(oid).trim();
                    if (s.matches("^\\d+$")) {
                        orderId = Long.parseLong(s);
                    }
                } catch (Exception ignored) {}
            }
            Object oc = payload.get("orderCode");
            if (oc != null) {
                orderCode = String.valueOf(oc).trim();
            }
        }

        Order order;
        if (orderId == null && (orderCode == null || orderCode.isEmpty())) {
            Pageable oneOldest = PageRequest.of(0, 1, Sort.by(Sort.Direction.ASC, "createdAt"));
            Page<Order> page = orderRepository.findByStatus(Order.OrderStatus.READY_FOR_DELIVERY, oneOldest);
            if (page.getContent().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "No READY_FOR_DELIVERY orders"
                ));
            }
            order = page.getContent().get(0);
        } else if (orderId != null) {
            order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "error", "Order not found: " + orderId));
            }
        } else {
            order = orderRepository.findByOrderCode(orderCode).orElse(null);
            if (order == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("success", false, "error", "Order not found by code: " + orderCode));
            }
        }
        Optional<DroneAssignment> assignedOpt = fleetService.autoAssignDrone(order);
        if (assignedOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("success", false, "message", "No available drones"));
        }

        DroneAssignment assignment = assignedOpt.get();

        // Optional: immediately start delivery and simulation if client requests
        boolean start = true; // Mặc định tự động bắt đầu mô phỏng cho demo đơn giản
        try {
            Object startObj = payload != null ? ((Map<?,?>)payload).get("start") : null;
            if (startObj != null) {
                start = Boolean.TRUE.equals(startObj);
            }
        } catch (Exception ignored) {}

        if (start) {
            // Update order/delivery/drone statuses to kick off delivery
            order.setStatus(Order.OrderStatus.OUT_FOR_DELIVERY);
            order.setUpdatedAt(java.time.LocalDateTime.now());
            orderRepository.save(order);

            Delivery delivery = assignment.getDelivery();
            if (delivery != null) {
                delivery.setStatus(Delivery.DeliveryStatus.IN_PROGRESS);
                delivery.setCurrentSegment("W0_W1");
                delivery.setSegmentStartTime(java.time.LocalDateTime.now());
                deliveryRepository.save(delivery);

                Drone drone = assignment.getDrone();
                drone.setStatus(Drone.DroneStatus.EN_ROUTE_TO_STORE);
                droneRepository.save(drone);

                // Start simulation loop
                droneSimulator.startSimulation(delivery.getId());
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "assignmentId", assignment.getId(),
                "droneId", assignment.getDrone().getId(),
                "deliveryId", assignment.getDelivery() != null ? assignment.getDelivery().getId() : null,
                "started", start
        ));
    }

    /**
     * POST /drone/assignments/{assignmentId}/complete
     * Hoàn tất assignment và đưa drone về trạng thái IDLE một cách chuẩn
     */
    @PostMapping("/{assignmentId}/complete")
    @PreAuthorize("hasAnyRole('ADMIN','MERCHANT','STAFF')")
    public ResponseEntity<?> completeAssignment(@PathVariable Long assignmentId) {
        try {
            fleetService.completeAssignment(assignmentId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Assignment completed and drone set to IDLE",
                    "assignmentId", assignmentId
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "error", ex.getMessage()));
        }
    }

    /**
     * POST /drone/assignments/drone/{droneId}/complete-current
     * Hoàn tất assignment đang hoạt động của một drone (nếu có) và đưa drone về IDLE
     */
    @PostMapping("/drone/{droneId}/complete-current")
    @PreAuthorize("hasAnyRole('ADMIN','MERCHANT','STAFF')")
    public ResponseEntity<?> completeCurrentAssignment(@PathVariable Long droneId) {
        try {
            Optional<com.fastfood.management.entity.DroneAssignment> current = fleetService.getCurrentAssignment(droneId);
            if (current.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "No active assignment for this drone",
                        "droneId", droneId,
                        "hasAssignment", false
                ));
            }

            Long assignmentId = current.get().getId();
            fleetService.completeAssignment(assignmentId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Current assignment completed and drone set to IDLE",
                    "droneId", droneId,
                    "assignmentId", assignmentId,
                    "hasAssignment", false
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "error", ex.getMessage()));
        }
    }

    /**
     * POST /drone/assignments/auto-oldest
     * Lấy đơn READY_FOR_DELIVERY cũ nhất (order by createdAt ASC), auto-assign drone, và bắt đầu mô phỏng.
     * Payload hỗ trợ tuỳ chọn: { "storeId": Long, "start": true }
     */
    @PostMapping("/auto-oldest")
    @PreAuthorize("hasAnyRole('ADMIN','MERCHANT','STAFF')")
    public ResponseEntity<?> autoAssignOldest(@RequestBody(required = false) Map<String, Object> payload) {
        try {
            Long storeId = payload != null && payload.get("storeId") != null ? Long.valueOf(payload.get("storeId").toString()) : null;
            boolean start = payload != null && Boolean.TRUE.equals(payload.get("start"));

            Pageable oneOldest = PageRequest.of(0, 1, Sort.by(Sort.Direction.ASC, "createdAt"));
            Page<Order> page = storeId != null
                    ? orderRepository.findByStoreIdAndStatus(storeId, Order.OrderStatus.READY_FOR_DELIVERY, oneOldest)
                    : orderRepository.findByStatus(Order.OrderStatus.READY_FOR_DELIVERY, oneOldest);

            if (page.getContent().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "No READY_FOR_DELIVERY orders"
                ));
            }

            Order order = page.getContent().get(0);
            Optional<DroneAssignment> assignedOpt = fleetService.autoAssignDrone(order);
            if (assignedOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of("success", false, "message", "No available drones"));
            }

            DroneAssignment assignment = assignedOpt.get();

            // Chuẩn bị bắt đầu giao hàng đơn giản cho demo
            order.setStatus(Order.OrderStatus.OUT_FOR_DELIVERY);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);

            Delivery delivery = assignment.getDelivery();
            delivery.setStatus(Delivery.DeliveryStatus.IN_PROGRESS);
            delivery.setCurrentSegment("W0_W1");
            delivery.setSegmentStartTime(LocalDateTime.now());
            deliveryRepository.save(delivery);

            Drone drone = assignment.getDrone();
            drone.setStatus(Drone.DroneStatus.EN_ROUTE_TO_STORE);
            droneRepository.save(drone);

            if (start) {
                droneSimulator.startSimulation(delivery.getId());
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Assigned oldest READY order and started delivery",
                    "assignmentId", assignment.getId(),
                    "droneId", drone.getId(),
                    "deliveryId", delivery.getId(),
                    "orderId", order.getId(),
                    "started", start
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "error", ex.getMessage()));
        }
    }

    /**
     * POST /drone/assignments/auto-queue
     * Gán lần lượt các đơn READY theo createdAt ASC cho drone rảnh, tối đa "limit" đơn, và có thể tự động bắt đầu mô phỏng.
     * Payload: { "storeId": Long?, "limit": Integer?, "start": Boolean? }
     */
    @PostMapping("/auto-queue")
    @PreAuthorize("hasAnyRole('ADMIN','MERCHANT','STAFF')")
    public ResponseEntity<?> autoAssignQueue(@RequestBody(required = false) Map<String, Object> payload) {
        try {
            Long storeId = payload != null && payload.get("storeId") != null ? Long.valueOf(payload.get("storeId").toString()) : null;
            int limit = payload != null && payload.get("limit") != null ? Integer.parseInt(payload.get("limit").toString()) : 5;
            boolean start = payload != null && Boolean.TRUE.equals(payload.get("start"));

            Pageable oldestN = PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.ASC, "createdAt"));
            Page<Order> page = storeId != null
                    ? orderRepository.findByStoreIdAndStatus(storeId, Order.OrderStatus.READY_FOR_DELIVERY, oldestN)
                    : orderRepository.findByStatus(Order.OrderStatus.READY_FOR_DELIVERY, oldestN);

            List<Map<String, Object>> results = new ArrayList<>();
            List<Order> candidates = page.getContent();
            if (candidates.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "assignedCount", 0,
                        "message", "No READY_FOR_DELIVERY orders"
                ));
            }

            for (Order order : candidates) {
                Optional<DroneAssignment> assignedOpt = fleetService.autoAssignDrone(order);
                if (assignedOpt.isEmpty()) {
                    // Hết drone rảnh – dừng vòng lặp
                    break;
                }
                DroneAssignment assignment = assignedOpt.get();

                order.setStatus(Order.OrderStatus.OUT_FOR_DELIVERY);
                order.setUpdatedAt(LocalDateTime.now());
                orderRepository.save(order);

                Delivery delivery = assignment.getDelivery();
                delivery.setStatus(Delivery.DeliveryStatus.IN_PROGRESS);
                delivery.setCurrentSegment("W0_W1");
                delivery.setSegmentStartTime(LocalDateTime.now());
                deliveryRepository.save(delivery);

                Drone drone = assignment.getDrone();
                drone.setStatus(Drone.DroneStatus.EN_ROUTE_TO_STORE);
                droneRepository.save(drone);

                if (start) {
                    droneSimulator.startSimulation(delivery.getId());
                }

                results.add(Map.of(
                        "assignmentId", assignment.getId(),
                        "orderId", order.getId(),
                        "deliveryId", delivery.getId(),
                        "droneId", drone.getId()
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "assignedCount", results.size(),
                    "started", start,
                    "results", results
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "error", ex.getMessage()));
        }
    }
}