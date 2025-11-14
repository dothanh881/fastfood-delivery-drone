package com.fastfood.management.controller;

import com.fastfood.management.dto.request.DroneAssignmentRequest;
import com.fastfood.management.dto.response.DroneAssignmentResponse;
import com.fastfood.management.entity.Delivery;
import com.fastfood.management.repository.DeliveryRepository;
import com.fastfood.management.service.api.DroneSimulator;
import com.fastfood.management.entity.Drone;
import com.fastfood.management.entity.DroneAssignment;
import com.fastfood.management.entity.Order;
import com.fastfood.management.repository.DroneRepository;
import com.fastfood.management.repository.OrderRepository;
import com.fastfood.management.service.api.FleetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/drone")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DroneController {

    private final DroneRepository droneRepository;
    private final FleetService fleetService;
    private final OrderRepository orderRepository;
    private final DeliveryRepository deliveryRepository;
    private final DroneSimulator droneSimulator;

    @GetMapping("/drones")
    public ResponseEntity<List<Drone>> listDrones(@RequestParam(value = "status", required = false) Drone.DroneStatus status) {
        if (status != null) {
            return ResponseEntity.ok(droneRepository.findByStatus(status));
        }
        return ResponseEntity.ok(droneRepository.findAll());
    }

    @GetMapping("/drones/available")
    public ResponseEntity<List<Drone>> listAvailable() {
        return ResponseEntity.ok(droneRepository.findByStatus(Drone.DroneStatus.IDLE));
    }
    
    
    
    /**
     * POST /assignments/manual - Gán drone thủ công
     */
    @PostMapping("/assignments/manual")
    public ResponseEntity<?> manualAssignDrone(@RequestBody DroneAssignmentRequest request) {
        try {
            Order order = orderRepository.findById(request.getOrderId())
                    .orElseThrow(() -> new IllegalArgumentException("Order not found: " + request.getOrderId()));
            
            Drone drone = droneRepository.findById(request.getDroneId())
                    .orElseThrow(() -> new IllegalArgumentException("Drone not found: " + request.getDroneId()));
            
            if (order.getStatus() != Order.OrderStatus.READY_FOR_DELIVERY) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Order must be READY_FOR_DELIVERY status"));
            }
            
            if (drone.getStatus() != Drone.DroneStatus.IDLE) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Drone is not available for assignment"));
            }
            
            DroneAssignment assignment = fleetService.manualAssignDrone(order, drone, "ADMIN"); // TODO: Get from auth

            // Optional: immediately start delivery and simulation if client requests
            boolean start = false;
            try {
                start = request.isStart();
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

                    Drone assignedDrone = assignment.getDrone();
                    assignedDrone.setStatus(Drone.DroneStatus.EN_ROUTE_TO_STORE);
                    droneRepository.save(assignedDrone);

                    // Start simulation loop
                    droneSimulator.startSimulation(delivery.getId());
                }
            }
            DroneAssignmentResponse response = buildAssignmentResponse(assignment);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", start ? "Manual assignment started" : "Manual assignment completed",
                "assignment", response,
                "started", start
            ));
            
        } catch (Exception e) {
            log.error("Error in manual assignment: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * GET /assignments/drone/{droneId}/current - Lấy assignment hiện tại của drone
     */
    @GetMapping("/assignments/drone/{droneId}/current")
    public ResponseEntity<?> getCurrentAssignment(@PathVariable Long droneId) {
        Optional<DroneAssignment> assignment = fleetService.getCurrentAssignment(droneId);
        
        if (assignment.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "droneId", droneId,
                "hasAssignment", false
            ));
        }
        
        DroneAssignmentResponse response = buildAssignmentResponse(assignment.get());
        return ResponseEntity.ok(Map.of(
            "droneId", droneId,
            "hasAssignment", true,
            "assignment", response
        ));
    }
    
    private DroneAssignmentResponse buildAssignmentResponse(DroneAssignment assignment) {
        Map<String, Double[]> waypoints = Map.of(
            "W0", new Double[]{assignment.getDelivery().getW0Lat(), assignment.getDelivery().getW0Lng()},
            "W1", new Double[]{assignment.getDelivery().getW1Lat(), assignment.getDelivery().getW1Lng()},
            "W2", new Double[]{assignment.getDelivery().getW2Lat(), assignment.getDelivery().getW2Lng()},
            "W3", new Double[]{assignment.getDelivery().getW3Lat(), assignment.getDelivery().getW3Lng()}
        );
        
        return DroneAssignmentResponse.builder()
                .deliveryId(assignment.getDelivery().getId())
                .droneId(assignment.getDrone().getId())
                .orderId(assignment.getOrder().getId())
                .waypoints(waypoints)
                .etaSec(assignment.getDelivery().getEtaSeconds())
                .status(assignment.getDelivery().getStatus().toString())
                .message("Assignment created successfully")
                .build();
    }
}