package com.fastfood.management.controller;

import com.fastfood.management.entity.*;
import com.fastfood.management.repository.*;
import com.fastfood.management.service.api.DroneSimulator;
import com.fastfood.management.service.api.FleetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Demo Controller - Để demo nhanh các tính năng mà không cần UI phức tạp
 * Chỉ dùng cho demo, không dùng trong production
 */
@RestController
@RequestMapping("/api/demo")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DemoController {

    private final OrderRepository orderRepository;
    private final DroneRepository droneRepository;
    private final DeliveryRepository deliveryRepository;
    private final DroneAssignmentRepository assignmentRepository;
    private final FleetService fleetService;
    private final DroneSimulator droneSimulator;

    /**
     * GET /demo/status - Xem trạng thái hệ thống
     */
    @GetMapping("/status")
    public ResponseEntity<?> getSystemStatus() {
        long totalOrders = orderRepository.count();
        long totalDrones = droneRepository.count();
        long activeDrones = droneRepository.countByStatus(Drone.DroneStatus.ASSIGNED);
        long activeDeliveries = deliveryRepository.countByStatus(Delivery.DeliveryStatus.IN_PROGRESS);

        return ResponseEntity.ok(Map.of(
            "totalOrders", totalOrders,
            "totalDrones", totalDrones,
            "activeDrones", activeDrones,
            "activeDeliveries", activeDeliveries,
            "timestamp", LocalDateTime.now()
        ));
    }

    /**
     * POST /demo/order/{orderId}/prepare - Chuyển order sang PREPARING
     */
    @PostMapping("/order/{orderId}/prepare")
    public ResponseEntity<?> prepareOrder(@PathVariable Long orderId) {
        try {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

            if (order.getStatus() != Order.OrderStatus.CONFIRMED) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Order must be CONFIRMED to prepare"));
            }

            order.setStatus(Order.OrderStatus.PREPARING);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Order is now being prepared",
                "orderId", orderId,
                "status", order.getStatus()
            ));

        } catch (Exception e) {
            log.error("Error preparing order {}: {}", orderId, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /demo/order/{orderId}/ready - Chuyển order sang READY_FOR_DELIVERY
     */
    @PostMapping("/order/{orderId}/ready")
    public ResponseEntity<?> markOrderReady(@PathVariable Long orderId) {
        try {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

            if (order.getStatus() != Order.OrderStatus.PREPARING) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Order must be PREPARING to mark ready"));
            }

            order.setStatus(Order.OrderStatus.READY_FOR_DELIVERY);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);

            // Tạo delivery record nếu chưa có
            Optional<Delivery> existingDelivery = deliveryRepository.findByOrderId(orderId);
            if (existingDelivery.isEmpty()) {
                Delivery delivery = Delivery.builder()
                        .order(order)
                        .status(Delivery.DeliveryStatus.PENDING)
                        .w1Lat(order.getStore().getLatitude())
                        .w1Lng(order.getStore().getLongitude())
                        .w2Lat(order.getAddress().getLatitude())
                        .w2Lng(order.getAddress().getLongitude())
                        .build();
                deliveryRepository.save(delivery);
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Order is ready for delivery",
                "orderId", orderId,
                "status", order.getStatus()
            ));

        } catch (Exception e) {
            log.error("Error marking order ready {}: {}", orderId, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /demo/order/{orderId}/assign-drone - Gán drone và bắt đầu giao hàng
     */
    @PostMapping("/order/{orderId}/assign-drone")
    public ResponseEntity<?> assignDroneAndStartDelivery(@PathVariable Long orderId) {
        try {
            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderId));

            if (order.getStatus() != Order.OrderStatus.READY_FOR_DELIVERY) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Order must be READY_FOR_DELIVERY"));
            }

            // Gán drone tự động
            Optional<DroneAssignment> assignment = fleetService.autoAssignDrone(order);
            if (assignment.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No available drones"));
            }

            // Bắt đầu giao hàng
            order.setStatus(Order.OrderStatus.OUT_FOR_DELIVERY);
            orderRepository.save(order);

            // Cập nhật delivery
            Delivery delivery = assignment.get().getDelivery();
            delivery.setStatus(Delivery.DeliveryStatus.IN_PROGRESS);
            delivery.setCurrentSegment("W0_W1");
            delivery.setSegmentStartTime(LocalDateTime.now());
            delivery.setEtaSeconds(300); // 5 phút
            deliveryRepository.save(delivery);

            // Cập nhật drone
            Drone drone = assignment.get().getDrone();
            drone.setStatus(Drone.DroneStatus.EN_ROUTE_TO_STORE);
            droneRepository.save(drone);

            // Bắt đầu simulation
            droneSimulator.startSimulation(delivery.getId());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Drone assigned and delivery started",
                "orderId", orderId,
                "droneId", drone.getId(),
                "deliveryId", delivery.getId()
            ));

        } catch (Exception e) {
            log.error("Error assigning drone for order {}: {}", orderId, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /demo/delivery/{deliveryId}/complete - Hoàn thành giao hàng ngay lập tức
     */
    @PostMapping("/delivery/{deliveryId}/complete")
    public ResponseEntity<?> completeDelivery(@PathVariable Long deliveryId) {
        try {
            Delivery delivery = deliveryRepository.findById(deliveryId)
                    .orElseThrow(() -> new IllegalArgumentException("Delivery not found: " + deliveryId));

            // Dừng simulation
            droneSimulator.stopSimulation(deliveryId);

            // Cập nhật trạng thái
            delivery.setStatus(Delivery.DeliveryStatus.COMPLETED);
            delivery.setUpdatedAt(LocalDateTime.now());
            deliveryRepository.save(delivery);

            Order order = delivery.getOrder();
            order.setStatus(Order.OrderStatus.DELIVERED);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);

            Drone drone = delivery.getDrone();
            drone.setStatus(Drone.DroneStatus.IDLE);
            drone.setCurrentLat(drone.getHomeLat());
            drone.setCurrentLng(drone.getHomeLng());
            droneRepository.save(drone);

            // Cập nhật assignment
            Optional<DroneAssignment> assignment = assignmentRepository.findByOrderId(order.getId());
            if (assignment.isPresent()) {
                assignment.get().setCompletedAt(LocalDateTime.now());
                assignmentRepository.save(assignment.get());
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Delivery completed successfully",
                "deliveryId", deliveryId,
                "orderId", order.getId()
            ));

        } catch (Exception e) {
            log.error("Error completing delivery {}: {}", deliveryId, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /demo/reset - Reset tất cả về trạng thái ban đầu
     */
    @PostMapping("/reset")
    public ResponseEntity<?> resetSystem() {
        try {
            // Dừng tất cả simulations
            deliveryRepository.findByStatus(Delivery.DeliveryStatus.IN_PROGRESS)
                    .forEach(delivery -> droneSimulator.stopSimulation(delivery.getId()));

            // Reset drones về IDLE
            droneRepository.findAll().forEach(drone -> {
                drone.setStatus(Drone.DroneStatus.IDLE);
                drone.setCurrentLat(drone.getHomeLat());
                drone.setCurrentLng(drone.getHomeLng());
                droneRepository.save(drone);
            });

            // Reset orders về CONFIRMED
            orderRepository.findAll().forEach(order -> {
                if (order.getId() <= 3) { // Chỉ reset demo orders
                    order.setStatus(Order.OrderStatus.CONFIRMED);
                    order.setUpdatedAt(LocalDateTime.now());
                    orderRepository.save(order);
                }
            });

            // Xóa deliveries và assignments
            assignmentRepository.deleteAll();
            deliveryRepository.deleteAll();

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "System reset successfully"
            ));

        } catch (Exception e) {
            log.error("Error resetting system: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}