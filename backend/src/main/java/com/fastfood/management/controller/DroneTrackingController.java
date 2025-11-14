package com.fastfood.management.controller;

import com.fastfood.management.service.api.DroneTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/drone-tracking")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DroneTrackingController {

    private final DroneTrackingService droneTrackingService;

    /**
     * GET /api/drone-tracking/positions - Lấy vị trí tất cả drone đang hoạt động
     */
    @GetMapping("/positions")
    public ResponseEntity<?> getAllDronePositions() {
        try {
            List<Map<String, Object>> positions = droneTrackingService.getAllActiveDronePositions();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "positions", positions,
                "total", positions.size()
            ));
        } catch (Exception e) {
            log.error("Error fetching drone positions: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/drone-tracking/delivery/{id} - Lấy thông tin tracking của delivery
     */
    @GetMapping("/delivery/{id}")
    public ResponseEntity<?> getDeliveryTracking(@PathVariable Long id) {
        try {
            Map<String, Object> trackingInfo = droneTrackingService.getDeliveryTrackingInfo(id);
            
            if (trackingInfo == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "tracking", trackingInfo
            ));
        } catch (Exception e) {
            log.error("Error fetching delivery tracking for delivery {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/drone-tracking/broadcast-fleet - Broadcast trạng thái fleet
     */
    @PostMapping("/broadcast-fleet")
    public ResponseEntity<?> broadcastFleetStatus() {
        try {
            droneTrackingService.broadcastFleetStatus();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Fleet status broadcasted successfully"
            ));
        } catch (Exception e) {
            log.error("Error broadcasting fleet status: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/drone-tracking/drone/{id}/gps - Cập nhật GPS drone (for testing)
     */
    @PostMapping("/drone/{id}/gps")
    public ResponseEntity<?> updateDroneGps(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        try {
            double lat = ((Number) request.get("lat")).doubleValue();
            double lng = ((Number) request.get("lng")).doubleValue();
            double batteryLevel = request.containsKey("batteryLevel") ? 
                ((Number) request.get("batteryLevel")).doubleValue() : 100.0;
            
            droneTrackingService.updateDroneGps(id, lat, lng, batteryLevel);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Drone GPS updated successfully",
                "droneId", id
            ));
        } catch (Exception e) {
            log.error("Error updating drone GPS: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/drone-tracking/delivery/{id}/progress - Cập nhật tiến độ delivery (for testing)
     */
    @PostMapping("/delivery/{id}/progress")
    public ResponseEntity<?> updateDeliveryProgress(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        try {
            if (request == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "BAD_REQUEST",
                        "message", "Missing request body"
                ));
            }

            Object segObj = request.get("currentSegment");
            Object etaObj = request.get("etaSeconds");
            Object statusObj = request.get("status");

            if (segObj == null || etaObj == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "MISSING_PARAMETER",
                        "message", "currentSegment and etaSeconds are required"
                ));
            }

            String currentSegment = String.valueOf(segObj);
            int etaSeconds = ((Number) etaObj).intValue();
            String status = statusObj != null ? String.valueOf(statusObj) : null;

            droneTrackingService.updateDeliveryProgress(id, currentSegment, etaSeconds, status);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Delivery progress updated successfully",
                    "deliveryId", id
            ));
        } catch (ClassCastException e) {
            // Khi client gửi sai kiểu (ví dụ: etaSeconds là string), trả về lỗi rõ ràng
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "INVALID_ARGUMENT",
                    "message", "etaSeconds must be a number"
            ));
        } catch (Exception e) {
            log.error("Error updating delivery progress: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}