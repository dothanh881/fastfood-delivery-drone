package com.fastfood.management.service.impl;

import com.fastfood.management.entity.Drone;
import com.fastfood.management.entity.Delivery;
import com.fastfood.management.entity.DroneAssignment;
import com.fastfood.management.repository.DroneRepository;
import com.fastfood.management.repository.DeliveryRepository;
import com.fastfood.management.repository.DroneAssignmentRepository;
import com.fastfood.management.service.api.DroneTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneTrackingServiceImpl implements DroneTrackingService {

    private final DroneRepository droneRepository;
    private final DeliveryRepository deliveryRepository;
    private final DroneAssignmentRepository assignmentRepository;
    private final SimpMessagingTemplate messagingTemplate;
    
    // Cache để lưu trữ real-time data
    private final Map<Long, DroneGpsData> droneGpsCache = new ConcurrentHashMap<>();
    private final Map<Long, DeliveryProgress> deliveryProgressCache = new ConcurrentHashMap<>();

    // Giới hạn tọa độ trong khu vực TP.HCM (bounding box gần đúng)
    private static final double HCMC_MIN_LAT = 10.35;
    private static final double HCMC_MAX_LAT = 11.00;
    private static final double HCMC_MIN_LNG = 106.20;
    private static final double HCMC_MAX_LNG = 106.95;

    @Override
    public void updateDroneGps(Long droneId, double lat, double lng, double batteryLevel) {
        try {
            // Validate lat/lng hợp lệ và nằm trong khu vực TP.HCM
            if (!isValidLatLng(lat, lng)) {
                throw new IllegalArgumentException("Invalid latitude/longitude values");
            }
            if (!isWithinHcmBounds(lat, lng)) {
                throw new IllegalArgumentException("Coordinates out of Ho Chi Minh City bounds");
            }

            // Clamp battery về khoảng [0, 100]
            double battery = Math.max(0.0, Math.min(100.0, batteryLevel));
            // Cập nhật database
            Optional<Drone> droneOpt = droneRepository.findById(droneId);
            if (droneOpt.isPresent()) {
                Drone drone = droneOpt.get();
                drone.setCurrentLat(lat);
                drone.setCurrentLng(lng);
                droneRepository.save(drone);

                // Cập nhật cache
                DroneGpsData gpsData = new DroneGpsData(droneId, lat, lng, battery, LocalDateTime.now());
                droneGpsCache.put(droneId, gpsData);

                // Broadcast qua WebSocket
                Map<String, Object> update = Map.of(
                    "type", "DRONE_GPS_UPDATE",
                    "droneId", droneId,
                    "lat", lat,
                    "lng", lng,
                    "batteryLevel", battery,
                    "timestamp", LocalDateTime.now().toString()
                );
                
                messagingTemplate.convertAndSend("/topic/drone-tracking", update);
                log.debug("Sent GPS update for drone {}: lat={}, lng={}, battery={}%", 
                    droneId, lat, lng, battery);
            }
        } catch (Exception e) {
            log.error("Error updating drone GPS for drone {}: {}", droneId, e.getMessage());
        }
    }

    private boolean isValidLatLng(double lat, double lng) {
        return lat >= -90.0 && lat <= 90.0 && lng >= -180.0 && lng <= 180.0;
    }

    private boolean isWithinHcmBounds(double lat, double lng) {
        return lat >= HCMC_MIN_LAT && lat <= HCMC_MAX_LAT && lng >= HCMC_MIN_LNG && lng <= HCMC_MAX_LNG;
    }

    @Override
    public void updateDeliveryProgress(Long deliveryId, String currentSegment, int etaSeconds, String status) {
        try {
            // Cập nhật database
            Optional<Delivery> deliveryOpt = deliveryRepository.findById(deliveryId);
            if (deliveryOpt.isPresent()) {
                Delivery delivery = deliveryOpt.get();
                delivery.setCurrentSegment(currentSegment);
                delivery.setEtaSeconds(etaSeconds);
                
                if (status != null) {
                    delivery.setStatus(Delivery.DeliveryStatus.valueOf(status));
                }
                
                deliveryRepository.save(delivery);

                // Cập nhật cache
                DeliveryProgress progress = new DeliveryProgress(
                    deliveryId, currentSegment, etaSeconds, status, LocalDateTime.now()
                );
                deliveryProgressCache.put(deliveryId, progress);

                // Broadcast qua WebSocket
                Map<String, Object> update = Map.of(
                    "type", "DELIVERY_PROGRESS_UPDATE",
                    "deliveryId", deliveryId,
                    "currentSegment", currentSegment,
                    "etaSeconds", etaSeconds,
                    "status", status != null ? status : delivery.getStatus().toString(),
                    "timestamp", LocalDateTime.now().toString()
                );
                
                messagingTemplate.convertAndSend("/topic/delivery-tracking", update);
                log.debug("Sent delivery progress update for delivery {}: segment={}, eta={}s, status={}", 
                    deliveryId, currentSegment, etaSeconds, status);
            }
        } catch (Exception e) {
            log.error("Error updating delivery progress for delivery {}: {}", deliveryId, e.getMessage());
        }
    }

    @Override
    public void notifyDroneStatusChange(Long droneId, String oldStatus, String newStatus) {
        try {
            Map<String, Object> notification = Map.of(
                "type", "DRONE_STATUS_CHANGE",
                "droneId", droneId,
                "oldStatus", oldStatus,
                "newStatus", newStatus,
                "timestamp", LocalDateTime.now().toString()
            );
            
            messagingTemplate.convertAndSend("/topic/drone-status", notification);
            log.info("Sent drone status change notification for drone {}: {} -> {}", 
                droneId, oldStatus, newStatus);
        } catch (Exception e) {
            log.error("Error sending drone status change notification: {}", e.getMessage());
        }
    }

    @Override
    public void notifyDeliveryEtaUpdate(Long deliveryId, int newEtaSeconds) {
        try {
            Map<String, Object> notification = Map.of(
                "type", "DELIVERY_ETA_UPDATE",
                "deliveryId", deliveryId,
                "etaSeconds", newEtaSeconds,
                "etaMinutes", Math.ceil(newEtaSeconds / 60.0),
                "timestamp", LocalDateTime.now().toString()
            );
            
            messagingTemplate.convertAndSend("/topic/delivery-eta", notification);
            log.debug("Sent ETA update for delivery {}: {}s", deliveryId, newEtaSeconds);
        } catch (Exception e) {
            log.error("Error sending delivery ETA update: {}", e.getMessage());
        }
    }

    @Override
    public List<Map<String, Object>> getAllActiveDronePositions() {
        List<Map<String, Object>> positions = new ArrayList<>();
        
        try {
            // Lấy tất cả drone đang hoạt động
            List<Drone> activeDrones = droneRepository.findByStatusIn(
                Arrays.asList(
                    Drone.DroneStatus.ASSIGNED,
                    Drone.DroneStatus.EN_ROUTE_TO_STORE,
                    Drone.DroneStatus.AT_STORE,
                    Drone.DroneStatus.EN_ROUTE_TO_CUSTOMER,
                    Drone.DroneStatus.ARRIVING,
                    Drone.DroneStatus.RETURN_TO_BASE
                )
            );
            
            for (Drone drone : activeDrones) {
                Map<String, Object> position = new HashMap<>();
                position.put("droneId", drone.getId());
                position.put("serialNumber", drone.getSerialNumber());
                position.put("lat", drone.getCurrentLat());
                position.put("lng", drone.getCurrentLng());
                position.put("batteryLevel", drone.getBatteryPct());
                position.put("status", drone.getStatus().toString());
                
                // Thêm thông tin delivery nếu có
                List<DroneAssignment> assignments = assignmentRepository
                    .findByDroneAndCompletedAtIsNull(drone);
                if (!assignments.isEmpty()) {
                    DroneAssignment assignment = assignments.get(0);
                    Delivery delivery = assignment.getDelivery();
                    position.put("deliveryId", delivery.getId());
                    position.put("orderId", assignment.getOrder().getId());
                    position.put("currentSegment", delivery.getCurrentSegment());
                    position.put("etaSeconds", delivery.getEtaSeconds());
                }
                
                positions.add(position);
            }
        } catch (Exception e) {
            log.error("Error getting active drone positions: {}", e.getMessage());
        }
        
        return positions;
    }

    @Override
    public Map<String, Object> getDeliveryTrackingInfo(Long deliveryId) {
        try {
            Optional<Delivery> deliveryOpt = deliveryRepository.findById(deliveryId);
            if (deliveryOpt.isEmpty()) {
                return null;
            }
            
            Delivery delivery = deliveryOpt.get();
            List<DroneAssignment> assignments = assignmentRepository.findByDelivery(delivery);
            
            if (assignments.isEmpty()) {
                return null;
            }
            
            DroneAssignment assignment = assignments.get(0);
            Drone drone = assignment.getDrone();
            
            Map<String, Object> trackingInfo = new HashMap<>();
            trackingInfo.put("deliveryId", deliveryId);
            trackingInfo.put("orderId", assignment.getOrder().getId());
            trackingInfo.put("droneId", drone.getId());
            trackingInfo.put("droneSerialNumber", drone.getSerialNumber());
            trackingInfo.put("currentLat", drone.getCurrentLat());
            trackingInfo.put("currentLng", drone.getCurrentLng());
            trackingInfo.put("batteryLevel", drone.getBatteryPct());
            trackingInfo.put("status", delivery.getStatus().toString());
            trackingInfo.put("currentSegment", delivery.getCurrentSegment());
            Integer etaSecondsVal = delivery.getEtaSeconds();
            int etaSeconds = etaSecondsVal != null ? etaSecondsVal : 0;
            trackingInfo.put("etaSeconds", etaSeconds);
            trackingInfo.put("etaMinutes", Math.ceil(etaSeconds / 60.0));
            
            // Parse waypoints
            if (delivery.getWaypoints() != null) {
                trackingInfo.put("waypoints", parseWaypoints(delivery.getWaypoints()));
            }
            
            return trackingInfo;
        } catch (Exception e) {
            log.error("Error getting delivery tracking info for delivery {}: {}", deliveryId, e.getMessage());
            return null;
        }
    }

    @Override
    public void broadcastFleetStatus() {
        try {
            List<Map<String, Object>> fleetStatus = getAllActiveDronePositions();
            
            Map<String, Object> broadcast = Map.of(
                "type", "FLEET_STATUS_UPDATE",
                "drones", fleetStatus,
                "timestamp", LocalDateTime.now().toString()
            );
            
            messagingTemplate.convertAndSend("/topic/fleet-status", broadcast);
            log.debug("Broadcasted fleet status with {} active drones", fleetStatus.size());
        } catch (Exception e) {
            log.error("Error broadcasting fleet status: {}", e.getMessage());
        }
    }

    private List<Map<String, Object>> parseWaypoints(String waypointsJson) {
        // Simple JSON parsing for waypoints
        // In production, use proper JSON library
        List<Map<String, Object>> waypoints = new ArrayList<>();
        
        try {
            // Mock waypoints parsing - replace with actual JSON parsing
            waypoints.add(Map.of("lat", 10.762622, "lng", 106.660172, "type", "PICKUP"));
            waypoints.add(Map.of("lat", 10.762822, "lng", 106.660372, "type", "DELIVERY"));
            waypoints.add(Map.of("lat", 10.762622, "lng", 106.660172, "type", "RETURN"));
        } catch (Exception e) {
            log.error("Error parsing waypoints: {}", e.getMessage());
        }
        
        return waypoints;
    }

    // Inner classes for data structures
    public static class DroneGpsData {
        public final Long droneId;
        public final double lat;
        public final double lng;
        public final double batteryLevel;
        public final LocalDateTime timestamp;

        public DroneGpsData(Long droneId, double lat, double lng, double batteryLevel, LocalDateTime timestamp) {
            this.droneId = droneId;
            this.lat = lat;
            this.lng = lng;
            this.batteryLevel = batteryLevel;
            this.timestamp = timestamp;
        }
    }

    public static class DeliveryProgress {
        public final Long deliveryId;
        public final String currentSegment;
        public final int etaSeconds;
        public final String status;
        public final LocalDateTime timestamp;

        public DeliveryProgress(Long deliveryId, String currentSegment, int etaSeconds, String status, LocalDateTime timestamp) {
            this.deliveryId = deliveryId;
            this.currentSegment = currentSegment;
            this.etaSeconds = etaSeconds;
            this.status = status;
            this.timestamp = timestamp;
        }
    }
    
    private List<Map<String, Double>> parseWaypoints(List<Double[]> waypoints) {
        return waypoints.stream()
            .map(waypoint -> Map.of("lat", waypoint[0], "lng", waypoint[1]))
            .collect(Collectors.toList());
    }
}