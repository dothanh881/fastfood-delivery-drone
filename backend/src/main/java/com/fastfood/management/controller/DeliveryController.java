package com.fastfood.management.controller;

import com.fastfood.management.dto.request.GpsUpdateRequest;
import com.fastfood.management.dto.response.DeliveryResponse;
import com.fastfood.management.dto.response.TrackingResponse;
import com.fastfood.management.entity.Delivery;
import com.fastfood.management.entity.DeliveryEvent;
import com.fastfood.management.entity.Drone;
import com.fastfood.management.repository.DeliveryRepository;
import com.fastfood.management.repository.DroneRepository;
import com.fastfood.management.repository.OrderRepository;
import com.fastfood.management.service.api.DeliveryService;
import com.fastfood.management.service.api.DroneSimulator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/deliveries")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DeliveryController {

    private final DeliveryService deliveryService;
    private final DeliveryRepository deliveryRepository;
    private final DroneRepository droneRepository;
    private final DroneSimulator droneSimulator;
    private final OrderRepository orderRepository;


    @GetMapping
    public ResponseEntity<List<DeliveryResponse>> getReadyForDelivery() {
        List<DeliveryResponse> deliveries = deliveryService.getReadyForDelivery();
        return ResponseEntity.ok(deliveries);
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<DeliveryResponse> acceptDelivery(
            @PathVariable Long id,
            @RequestParam("droneId") Long droneId) {
        DeliveryResponse delivery = deliveryService.acceptDelivery(id, droneId);
        return ResponseEntity.ok(delivery);
    }

    @PostMapping("/{id}/gps")
    public ResponseEntity<DeliveryResponse> updateGpsPosition(
            @PathVariable Long id,
            @Valid @RequestBody GpsUpdateRequest gpsRequest) {
        DeliveryResponse delivery = deliveryService.updateGpsPosition(id, gpsRequest);
        return ResponseEntity.ok(delivery);
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<DeliveryResponse> completeDelivery(@PathVariable Long id) {
        try {
            // Try treating id as a deliveryId first
            DeliveryResponse delivery = deliveryService.completeDelivery(id);
            return ResponseEntity.ok(delivery);
        } catch (IllegalStateException badState) {
            return ResponseEntity.badRequest().body(null);
        } catch (IllegalArgumentException notDelivery) {
            // Fallback: treat id as orderId and complete its delivery if present
            try {
                com.fastfood.management.entity.Order order = orderRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng với id: " + id));
                Delivery linkedDelivery = order.getDelivery();
                if (linkedDelivery == null) {
                    return ResponseEntity.badRequest().body(new DeliveryResponse());
                }
                DeliveryResponse delivery = deliveryService.completeDelivery(linkedDelivery.getId());
                return ResponseEntity.ok(delivery);
            } catch (IllegalStateException e) {
                return ResponseEntity.badRequest().body(null);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(null);
            }
        }
    }

    @GetMapping("/{id}/track")
    public ResponseEntity<?> trackDelivery(@PathVariable("id") String id) {
        try {
            if (id == null || id.trim().isEmpty() || "null".equalsIgnoreCase(id.trim())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "INVALID_ARGUMENT",
                        "message", "Thiếu id để truy vết đơn giao"
                ));
            }

            // Parse id an toàn
            Long parsedId;
            try {
                parsedId = Long.parseLong(id.trim());
            } catch (NumberFormatException nfe) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "INVALID_ARGUMENT",
                        "message", "Id không hợp lệ: " + id
                ));
            }

            // Thử coi id là orderId trước
            try {
                TrackingResponse tracking = deliveryService.trackDelivery(parsedId);
                return ResponseEntity.ok(tracking);
            } catch (IllegalArgumentException notOrder) {
                // Nếu không phải orderId hợp lệ, fallback: coi id là deliveryId
                Delivery delivery = deliveryRepository.findById(parsedId)
                        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy delivery với id: " + parsedId));
                Long orderIdFromDelivery = delivery.getOrder() != null ? delivery.getOrder().getId() : null;
                if (orderIdFromDelivery == null) {
                    return ResponseEntity.status(404).body(Map.of(
                            "error", "NOT_FOUND",
                            "message", "Delivery " + parsedId + " không có thông tin đơn hàng đi kèm"
                    ));
                }
                TrackingResponse tracking = deliveryService.trackDelivery(orderIdFromDelivery);
                return ResponseEntity.ok(tracking);
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "INVALID_ARGUMENT",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error tracking delivery {}: {}", id, e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                    "error", "INTERNAL_ERROR",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * POST /deliveries/{id}/start - Bắt đầu delivery (chuyển sang IN_PROGRESS)
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<?> startDelivery(@PathVariable Long id) {
        try {
            Delivery delivery = deliveryRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Delivery not found: " + id));
            
            if (delivery.getStatus() != Delivery.DeliveryStatus.ASSIGNED) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Delivery must be ASSIGNED status to start"));
            }
            
            // Cập nhật trạng thái
            delivery.setStatus(Delivery.DeliveryStatus.IN_PROGRESS);
            delivery.setSegmentStartTime(LocalDateTime.now());
            delivery.setCurrentSegment("W0_W1");
            deliveryRepository.save(delivery);
            
            // Cập nhật drone status
            Drone drone = delivery.getDrone();
            drone.setStatus(Drone.DroneStatus.EN_ROUTE_TO_STORE);
            droneRepository.save(drone);
            
            // Bắt đầu simulation
            droneSimulator.startSimulation(delivery.getId());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Delivery started successfully",
                "deliveryId", id,
                "status", "IN_PROGRESS"
            ));
            
        } catch (Exception e) {
            log.error("Error starting delivery {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * GET /deliveries/{id}/detail - Lấy thông tin chi tiết delivery
     */
    @GetMapping("/{id}/detail")
    public ResponseEntity<?> getDeliveryDetail(@PathVariable Long id) {
        try {
            Delivery delivery = deliveryRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Delivery not found: " + id));
            
            // Tính toán vị trí hiện tại nếu đang IN_PROGRESS
            Map<String, Object> response = Map.of(
                "deliveryId", delivery.getId(),
                "orderId", delivery.getOrder().getId(),
                "droneId", delivery.getDrone().getId(),
                "status", delivery.getStatus().toString(),
                "currentSegment", delivery.getCurrentSegment() != null ? delivery.getCurrentSegment() : "N/A",
                "etaSec", delivery.getEtaSeconds() != null ? delivery.getEtaSeconds() : 0,
                "waypoints", Map.of(
                    "W0", new Double[]{delivery.getW0Lat(), delivery.getW0Lng()},
                    "W1", new Double[]{delivery.getW1Lat(), delivery.getW1Lng()},
                    "W2", new Double[]{delivery.getW2Lat(), delivery.getW2Lng()},
                    "W3", new Double[]{delivery.getW3Lat(), delivery.getW3Lng()}
                ),
                "currentPosition", delivery.getStatus() == Delivery.DeliveryStatus.IN_PROGRESS ? 
                    droneSimulator.calculateCurrentPosition(delivery) : 
                    new double[]{delivery.getDrone().getCurrentLat(), delivery.getDrone().getCurrentLng()}
            );
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error getting delivery detail {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * GET /deliveries/{id}/events - Lấy lịch sử events của delivery
     */
    @GetMapping("/{id}/events")
    public ResponseEntity<?> getDeliveryEvents(@PathVariable Long id) {
        try {
            Delivery delivery = deliveryRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Delivery not found: " + id));
            
            List<DeliveryEvent> events = delivery.getEvents();
            
            return ResponseEntity.ok(Map.of(
                "deliveryId", id,
                "eventCount", events.size(),
                "events", events
            ));
            
        } catch (Exception e) {
            log.error("Error getting delivery events {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * GET /deliveries/active - Lấy danh sách delivery đang hoạt động
     */
    @GetMapping("/active")
    public ResponseEntity<List<Delivery>> getActiveDeliveries() {
        List<Delivery> activeDeliveries = deliveryRepository.findByStatus(Delivery.DeliveryStatus.IN_PROGRESS);
        return ResponseEntity.ok(activeDeliveries);
    }
}