package com.fastfood.management.controller;

import com.fastfood.management.entity.Drone;
import com.fastfood.management.entity.DroneAssignment;
import com.fastfood.management.entity.Delivery;
import com.fastfood.management.repository.DroneRepository;
import com.fastfood.management.repository.DroneAssignmentRepository;
import com.fastfood.management.repository.DeliveryRepository;
import com.fastfood.management.service.api.FleetService;
import com.fastfood.management.service.api.DroneSimulator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/drone-management")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DroneManagementController {

    private final DroneRepository droneRepository;
    private final DroneAssignmentRepository assignmentRepository;
    private final DeliveryRepository deliveryRepository;
    private final FleetService fleetService;
    private final DroneSimulator droneSimulator;

    /**
     * GET /api/drone-management/stats - Thống kê số lượng drone theo trạng thái chính
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getFleetStats() {
        try {
            List<Drone> drones = droneRepository.findAll();
            Map<String, Long> counts = drones.stream()
                .collect(Collectors.groupingBy(d -> String.valueOf(d.getStatus()), Collectors.counting()));

            long idle = counts.getOrDefault(String.valueOf(Drone.DroneStatus.IDLE), 0L);
            long assigned = counts.getOrDefault(String.valueOf(Drone.DroneStatus.ASSIGNED), 0L);
            long delivering = counts.getOrDefault(String.valueOf(Drone.DroneStatus.EN_ROUTE_TO_STORE), 0L)
                + counts.getOrDefault(String.valueOf(Drone.DroneStatus.EN_ROUTE_TO_CUSTOMER), 0L)
                + counts.getOrDefault(String.valueOf(Drone.DroneStatus.ARRIVING), 0L);
            long returning = counts.getOrDefault(String.valueOf(Drone.DroneStatus.RETURN_TO_BASE), 0L);
            long charging = 0L; // trạng thái CHARGING chưa được định nghĩa trong DroneStatus
            long maintenance = counts.getOrDefault(String.valueOf(Drone.DroneStatus.MAINTENANCE), 0L);
            long offline = counts.getOrDefault(String.valueOf(Drone.DroneStatus.OFFLINE), 0L);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "total", drones.size(),
                "idleCount", idle,
                "assignedCount", assigned,
                "deliveringCount", delivering,
                "returningCount", returning,
                "chargingCount", charging,
                "maintenanceCount", maintenance,
                "offlineCount", offline
            ));
        } catch (Exception e) {
            log.error("Error fetching fleet stats: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/drone-management/drones - Lấy danh sách drone có hỗ trợ phân trang và lọc trạng thái
     */
    @GetMapping("/drones")
    public ResponseEntity<?> getAllDrones(
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "status", required = false) String status
    ) {
        try {
            // Nếu không có tham số phân trang, trả về danh sách như trước để giữ tương thích
            if (page == null || size == null) {
                List<Drone> drones = droneRepository.findAll();
                List<Map<String, Object>> droneList = drones.stream()
                        .map(this::buildDroneResponse)
                        .collect(Collectors.toList());

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "drones", droneList,
                        "total", drones.size()
                ));
            }

            int p = Math.max(0, page);
            int s = Math.max(1, size);

            org.springframework.data.domain.Pageable pageable =
                    org.springframework.data.domain.PageRequest.of(p, s,
                            // Sort theo 'id' để tránh lỗi nếu DB chưa có cột 'created_at'
                            org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));

            org.springframework.data.domain.Page<Drone> pageResult;

            Drone.DroneStatus filterStatus = null;
            java.util.List<Drone.DroneStatus> statusesFilter = null;
            if (status != null && !status.isBlank()) {
                String normalized = status.trim().toUpperCase();
                // Cho phép "DELIVERING" ánh xạ về nhóm trạng thái vận chuyển
                if ("DELIVERING".equals(normalized)) {
                    statusesFilter = java.util.Arrays.asList(
                            Drone.DroneStatus.EN_ROUTE_TO_STORE,
                            Drone.DroneStatus.EN_ROUTE_TO_CUSTOMER,
                            Drone.DroneStatus.ARRIVING
                    );
                } else {
                    try {
                        filterStatus = Drone.DroneStatus.valueOf(normalized);
                    } catch (IllegalArgumentException ignored) {
                        filterStatus = null;
                    }
                }
            }

            try {
                if (statusesFilter != null && !statusesFilter.isEmpty()) {
                    pageResult = droneRepository.findByStatusIn(statusesFilter, pageable);
                } else if (filterStatus != null) {
                    pageResult = droneRepository.findByStatus(filterStatus, pageable);
                } else {
                    pageResult = droneRepository.findAll(pageable);
                }
            } catch (Exception repoEx) {
                log.error("Paged query failed, falling back to in-memory pagination: {}", repoEx.getMessage());
                // Fallback: load all then paginate in-memory to avoid 500 for legacy schemas
                List<Drone> all = droneRepository.findAll();
                final java.util.List<Drone.DroneStatus> statusesFilterFinal = statusesFilter;
                final Drone.DroneStatus filterStatusFinal = filterStatus;
                if (statusesFilterFinal != null && !statusesFilterFinal.isEmpty()) {
                    final java.util.Set<Drone.DroneStatus> set = new java.util.HashSet<>(statusesFilterFinal);
                    all = all.stream().filter(d -> set.contains(d.getStatus())).collect(Collectors.toList());
                } else if (filterStatusFinal != null) {
                    all = all.stream().filter(d -> d.getStatus() == filterStatusFinal).collect(Collectors.toList());
                }
                int from = Math.min(p * s, all.size());
                int to = Math.min(from + s, all.size());
                List<Drone> slice = all.subList(from, to);
                pageResult = new org.springframework.data.domain.PageImpl<>(slice, pageable, all.size());
            }

            List<Map<String, Object>> droneList = pageResult.getContent().stream()
                    .map(this::buildDroneResponse)
                    .collect(Collectors.toList());

            Map<String, Object> pageMeta = Map.of(
                    "number", pageResult.getNumber(),
                    "size", pageResult.getSize(),
                    "totalElements", pageResult.getTotalElements(),
                    "totalPages", pageResult.getTotalPages()
            );

            Map<String, Object> payload = new HashMap<>();
            payload.put("success", true);
            payload.put("drones", droneList);
            payload.put("page", pageMeta);
            payload.put("total", pageResult.getTotalElements());
            // Cho phép status null mà không gây lỗi (Map.of không chấp nhận null)
            payload.put("status", status);
            return ResponseEntity.ok(payload);
        } catch (Exception e) {
            log.error("Error fetching drones: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/drone-management/drones - Tạo drone mới
     */
    @PostMapping("/drones")
    public ResponseEntity<?> createDrone(@RequestBody Map<String, Object> request) {
        try {
            // Lấy và validate các trường cơ bản
            String serial = null;
            Object serialObj = request.get("serialNumber");
            if (serialObj == null) serialObj = request.get("serial");
            if (serialObj != null) serial = String.valueOf(serialObj);

            if (serial == null || serial.isBlank()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "serialNumber là bắt buộc"));
            }

            // Kiểm tra trùng serial (cột unique), tránh lỗi khi insert
            boolean exists = droneRepository.existsBySerialIgnoreCase(serial);
            if (exists) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "serialNumber đã tồn tại"));
            }

            String model = (String) request.getOrDefault("model", "Unknown");

            Double homeLat = toDouble(request.get("homeLat"));
            Double homeLng = toDouble(request.get("homeLng"));
            Double currentLat = toDouble(request.get("currentLat"));
            Double currentLng = toDouble(request.get("currentLng"));
            Double battery = toDouble(request.get("batteryLevel"));
            Double maxPayload = toDouble(request.get("maxPayload"));
            Double maxRange = toDouble(request.get("maxRange"));

            Drone drone = Drone.builder()
                .serial(serial)
                .model(model)
                .status(Drone.DroneStatus.IDLE)
                .batteryPct(battery != null ? battery : 100.0)
                .homeLat(homeLat)
                .homeLng(homeLng)
                .currentLat(currentLat != null ? currentLat : homeLat)
                .currentLng(currentLng != null ? currentLng : homeLng)
                .maxPayloadKg(maxPayload)
                .maxRangeKm(maxRange)
                .lastAssignedAt(null)
                // Đặt createdAt thủ công để tránh lỗi auditing/nullable
                .createdAt(java.time.LocalDateTime.now())
                .build();

            Drone saved = droneRepository.save(drone);
            Map<String, Object> response = buildDroneResponse(saved);
            // Trả về trực tiếp shape phù hợp với frontend (DroneFleet)
            return ResponseEntity.status(201).body(response);
        } catch (Exception e) {
            log.error("Error creating drone: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PUT /api/drone-management/drones/{id} - Cập nhật thông tin cơ bản của drone
     */
    @PutMapping("/drones/{id}")
    public ResponseEntity<?> updateDrone(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        try {
            Optional<Drone> droneOpt = droneRepository.findById(id);
            if (droneOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Drone drone = droneOpt.get();

            // Cập nhật serial nếu cung cấp và không trùng
            Object serialObj = request.get("serialNumber");
            if (serialObj == null) serialObj = request.get("serial");
            if (serialObj != null) {
                String newSerial = String.valueOf(serialObj);
                if (newSerial != null && !newSerial.isBlank() && !newSerial.equalsIgnoreCase(drone.getSerialNumber())) {
                    boolean exists = droneRepository.existsBySerialIgnoreCase(newSerial);
                    if (exists) {
                        return ResponseEntity.badRequest().body(Map.of("error", "serialNumber đã tồn tại"));
                    }
                    drone.setSerial(newSerial);
                }
            }

            if (request.get("model") != null) {
                drone.setModel(String.valueOf(request.get("model")));
            }
            if (request.get("homeLat") != null) {
                Double v = toDouble(request.get("homeLat"));
                drone.setHomeLat(v);
            }
            if (request.get("homeLng") != null) {
                Double v = toDouble(request.get("homeLng"));
                drone.setHomeLng(v);
            }
            if (request.get("maxPayload") != null) {
                Double v = toDouble(request.get("maxPayload"));
                drone.setMaxPayloadKg(v);
            }
            if (request.get("maxRange") != null) {
                Double v = toDouble(request.get("maxRange"));
                drone.setMaxRangeKm(v);
            }
            if (request.get("batteryLevel") != null) {
                Double v = toDouble(request.get("batteryLevel"));
                if (v != null) drone.setBatteryPct(v);
            }
            if (request.get("currentLat") != null) {
                Double v = toDouble(request.get("currentLat"));
                drone.setCurrentLat(v);
            }
            if (request.get("currentLng") != null) {
                Double v = toDouble(request.get("currentLng"));
                drone.setCurrentLng(v);
            }
            if (request.get("isActive") != null) {
                boolean active = Boolean.parseBoolean(String.valueOf(request.get("isActive")));
                if (!active) {
                    drone.setStatus(Drone.DroneStatus.OFFLINE);
                } else if (drone.getStatus() == Drone.DroneStatus.OFFLINE) {
                    drone.setStatus(Drone.DroneStatus.IDLE);
                }
            }

            Drone saved = droneRepository.save(drone);
            return ResponseEntity.ok(buildDroneDetailResponse(saved));
        } catch (Exception e) {
            log.error("Error updating drone: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/drone-management/drones/{id} - Xóa drone nếu không có assignment hoạt động
     */
    @DeleteMapping("/drones/{id}")
    public ResponseEntity<?> deleteDrone(@PathVariable Long id) {
        try {
            Optional<Drone> droneOpt = droneRepository.findById(id);
            if (droneOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            // Không xóa nếu đang có assignment hoạt động
            Optional<DroneAssignment> current = fleetService.getCurrentAssignment(id);
            if (current.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Drone đang có assignment hoạt động, không thể xóa"
                ));
            }

            droneRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Đã xóa drone", "droneId", id));
        } catch (Exception e) {
            log.error("Error deleting drone: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/drone-management/drones/{id} - Lấy thông tin chi tiết drone
     */
    @GetMapping("/drones/{id}")
    public ResponseEntity<?> getDroneDetail(@PathVariable Long id) {
        try {
            Optional<Drone> droneOpt = droneRepository.findById(id);
            if (droneOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Drone drone = droneOpt.get();
            Map<String, Object> response = buildDroneDetailResponse(drone);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching drone detail: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PUT /api/drone-management/drones/{id}/status - Cập nhật trạng thái drone
     */
    @PutMapping("/drones/{id}/status")
    public ResponseEntity<?> updateDroneStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        try {
            Optional<Drone> droneOpt = droneRepository.findById(id);
            if (droneOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Drone drone = droneOpt.get();
            String newStatus = request.get("status");
            
            if (newStatus == null) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Status is required"));
            }

            // Đơn giản hoá cho demo: chấp nhận không phân biệt hoa thường và từ khoá thân thiện như "DELIVERING"
            String normalized = newStatus.trim().toUpperCase();
            Drone.DroneStatus status;
            try {
                if ("DELIVERING".equals(normalized)) {
                    status = Drone.DroneStatus.EN_ROUTE_TO_CUSTOMER; // ánh xạ từ "DELIVERING" cho demo
                } else {
                    status = Drone.DroneStatus.valueOf(normalized);
                }
            } catch (IllegalArgumentException iae) {
                return ResponseEntity.badRequest()
                    .body(Map.of(
                        "error", "INVALID_STATUS",
                        "message", "Valid statuses: OFFLINE, IDLE, ASSIGNED, EN_ROUTE_TO_STORE, AT_STORE, EN_ROUTE_TO_CUSTOMER, ARRIVING, RETURN_TO_BASE, MAINTENANCE",
                        "received", newStatus
                    ));
            }
            drone.setStatus(status);
            droneRepository.save(drone);

            log.info("Updated drone {} status to {}", id, newStatus);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Drone status updated successfully",
                "droneId", id,
                "newStatus", newStatus
            ));
        } catch (Exception e) {
            log.error("Error updating drone status: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/drone-management/drones/{id}/maintenance - Đưa drone vào bảo trì
     */
    @PostMapping("/drones/{id}/maintenance")
    public ResponseEntity<?> setDroneMaintenance(@PathVariable Long id) {
        try {
            Optional<Drone> droneOpt = droneRepository.findById(id);
            if (droneOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Drone drone = droneOpt.get();
            
            // Kiểm tra xem drone có đang thực hiện delivery không
            Optional<DroneAssignment> activeAssignment = fleetService.getCurrentAssignment(id);
            if (activeAssignment.isPresent()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Cannot set maintenance mode: drone is currently assigned to a delivery"));
            }

            drone.setStatus(Drone.DroneStatus.MAINTENANCE);
            droneRepository.save(drone);

            log.info("Set drone {} to maintenance mode", id);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Drone set to maintenance mode",
                "droneId", id
            ));
        } catch (Exception e) {
            log.error("Error setting drone maintenance: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/drone-management/drones/{id}/activate - Kích hoạt drone từ bảo trì
     */
    @PostMapping("/drones/{id}/activate")
    public ResponseEntity<?> activateDrone(@PathVariable Long id) {
        try {
            Optional<Drone> droneOpt = droneRepository.findById(id);
            if (droneOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Drone drone = droneOpt.get();
            drone.setStatus(Drone.DroneStatus.IDLE);
            droneRepository.save(drone);

            log.info("Activated drone {} from maintenance", id);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Drone activated successfully",
                "droneId", id
            ));
        } catch (Exception e) {
            log.error("Error activating drone: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/drone-management/assignments/active - Lấy danh sách assignment đang hoạt động
     */
    @GetMapping("/assignments/active")
    public ResponseEntity<?> getActiveAssignments() {
        try {
            List<DroneAssignment> activeAssignments = assignmentRepository.findByCompletedAtIsNull();
            List<Map<String, Object>> assignmentList = activeAssignments.stream()
                .map(this::buildAssignmentResponse)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "assignments", assignmentList,
                "total", activeAssignments.size()
            ));
        } catch (Exception e) {
            log.error("Error fetching active assignments: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/drone-management/deliveries/{id}/stop - Dừng delivery simulation
     */
    @PostMapping("/deliveries/{id}/stop")
    public ResponseEntity<?> stopDelivery(@PathVariable Long id) {
        try {
            Optional<Delivery> deliveryOpt = deliveryRepository.findById(id);
            if (deliveryOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            droneSimulator.stopSimulation(id);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Delivery simulation stopped",
                "deliveryId", id
            ));
        } catch (Exception e) {
            log.error("Error stopping delivery: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/drone-management/deliveries/{id}/resume - Tiếp tục delivery simulation
     */
    @PostMapping("/deliveries/{id}/resume")
    public ResponseEntity<?> resumeDelivery(@PathVariable Long id) {
        try {
            Optional<Delivery> deliveryOpt = deliveryRepository.findById(id);
            if (deliveryOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            droneSimulator.startSimulation(id);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Delivery simulation resumed",
                "deliveryId", id
            ));
        } catch (Exception e) {
            log.error("Error resuming delivery: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }

    // Helper methods
    private Map<String, Object> buildDroneResponse(Drone drone) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", drone.getId());
        response.put("serialNumber", drone.getSerialNumber());
        response.put("model", drone.getModel());
        response.put("status", String.valueOf(drone.getStatus()));
        response.put("batteryLevel", drone.getBatteryPct());
        response.put("currentLat", drone.getCurrentLat());
        response.put("currentLng", drone.getCurrentLng());
        response.put("homeLat", drone.getHomeLat());
        response.put("homeLng", drone.getHomeLng());
        response.put("maxPayload", drone.getMaxPayloadKg());
        response.put("maxRange", drone.getMaxRangeKm());
        response.put("lastAssignedAt", drone.getLastAssignedAt());
        response.put("isActive", drone.getStatus() != Drone.DroneStatus.MAINTENANCE);
        
        // Thêm thông tin assignment hiện tại nếu có
        try {
            Optional<DroneAssignment> currentAssignment = fleetService.getCurrentAssignment(drone.getId());
            if (currentAssignment.isPresent()) {
                DroneAssignment assignment = currentAssignment.get();
                if (assignment.getOrder() != null) {
                    response.put("assignedOrderId", assignment.getOrder().getId());
                }
                if (assignment.getDelivery() != null) {
                    response.put("deliveryId", assignment.getDelivery().getId());
                }
            }
        } catch (Exception ex) {
            log.warn("getCurrentAssignment failed for drone {}: {}", drone.getId(), ex.getMessage());
        }
        
        return response;
    }

    private Map<String, Object> buildDroneDetailResponse(Drone drone) {
        Map<String, Object> response = buildDroneResponse(drone);
        
        // Thêm thống kê chi tiết
        List<DroneAssignment> completedAssignments = assignmentRepository
            .findByDroneAndCompletedAtIsNotNull(drone);
        
        response.put("totalFlights", completedAssignments.size());
        response.put("flightHours", completedAssignments.size() * 0.5); // Mock calculation
        response.put("lastMaintenance", "2024-01-15"); // Mock data
        
        return response;
    }

    private Map<String, Object> buildAssignmentResponse(DroneAssignment assignment) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", assignment.getId());
        response.put("orderId", assignment.getOrder().getId());
        response.put("droneId", assignment.getDrone().getId());
        response.put("droneSerialNumber", assignment.getDrone().getSerialNumber());
        response.put("assignmentMode", assignment.getAssignmentMode().toString());
        response.put("assignedBy", assignment.getAssignedBy());
        response.put("assignedAt", assignment.getAssignedAt());
        
        if (assignment.getDelivery() != null) {
            Delivery delivery = assignment.getDelivery();
            response.put("deliveryId", delivery.getId());
            response.put("deliveryStatus", delivery.getStatus().toString());
            response.put("currentSegment", delivery.getCurrentSegment());
            response.put("etaSeconds", delivery.getEtaSeconds());
        }
        
        return response;
    }

    // Helper: chuyển object sang Double an toàn
    private Double toDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number) return ((Number) o).doubleValue();
        try {
            String s = String.valueOf(o);
            if (s.isBlank()) return null;
            return Double.parseDouble(s);
        } catch (Exception ex) {
            return null;
        }
    }
}