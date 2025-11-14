package com.fastfood.management.service.impl;

import com.fastfood.management.entity.*;
import com.fastfood.management.repository.DeliveryRepository;
import com.fastfood.management.repository.DroneAssignmentRepository;
import com.fastfood.management.repository.DroneRepository;
import com.fastfood.management.service.api.FleetService;
import com.fastfood.management.service.api.DroneTrackingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FleetServiceImpl implements FleetService {
    
    private final DroneRepository droneRepository;
    private final DroneAssignmentRepository assignmentRepository;
    private final DeliveryRepository deliveryRepository;
    private final DroneTrackingService droneTrackingService;

    // Demo config for simple ETA calculation
    private static final double DISPATCH_RADIUS_KM = 10.0; // chỉ chọn drone trong bán kính này quanh cửa hàng
    private static final double PATH_FACTOR = 1.10;         // hệ số đường bay so với đường thẳng
    private static final double V_AIR_KMH = 30.0;           // tốc độ bay danh định của drone (km/h)
    private static final double V_MIN_KMH = 5.0;            // tốc độ tối thiểu (km/h)
    private static final double V_MAX_KMH = 60.0;           // tốc độ tối đa (km/h)
    private static final int T_OVERHEAD_SEC = 60;           // thời gian chuẩn bị/cất cánh (s)
    private static final int T_QUEUE_SEC = 0;               // thời gian chờ xếp hàng (s)
    
    @Override
    @Transactional
    public Optional<DroneAssignment> autoAssignDrone(Order order) {
        log.info("Auto-assigning drone for order: {}", order.getId());
        
        List<Drone> availableDrones = getAvailableDrones();
        if (availableDrones.isEmpty()) {
            log.warn("No available drones for order: {}", order.getId());
            return Optional.empty();
        }

        // Lọc theo bán kính từ cửa hàng và rank theo ETA rồi khoảng cách đến cửa hàng
        Optional<Drone> selectedDrone = selectDroneByEta(order, availableDrones);
        if (selectedDrone.isEmpty()) {
            return Optional.empty();
        }
        
        return Optional.of(createAssignment(order, selectedDrone.get(), "SYSTEM", DroneAssignment.AssignmentMode.AUTO));
    }
    
    @Override
    @Transactional
    public DroneAssignment manualAssignDrone(Order order, Drone drone, String assignedBy) {
        log.info("Manual assignment: Order {} to Drone {} by {}", order.getId(), drone.getId(), assignedBy);
        
        if (drone.getStatus() != Drone.DroneStatus.IDLE) {
            throw new IllegalStateException("Drone " + drone.getId() + " is not available for assignment");
        }
        
        return createAssignment(order, drone, assignedBy, DroneAssignment.AssignmentMode.MANUAL);
    }
    
    private DroneAssignment createAssignment(Order order, Drone drone, String assignedBy, DroneAssignment.AssignmentMode mode) {
        // Validate required order data to avoid NPEs and invalid assignments
        if (order == null) {
            throw new IllegalStateException("Order is required for assignment");
        }
        if (order.getStore() == null) {
            throw new IllegalStateException("Order store is missing; cannot compute pickup coordinates");
        }
        if (order.getAddress() == null) {
            throw new IllegalStateException("Order address is missing; cannot compute destination coordinates");
        }
        if (order.getStore().getLatitude() == null || order.getStore().getLongitude() == null) {
            throw new IllegalStateException("Store coordinates are missing (lat/lng); please set store lat/lng");
        }
        if (order.getAddress().getLatitude() == null || order.getAddress().getLongitude() == null) {
            throw new IllegalStateException("Customer address coordinates are missing (lat/lng); please set address lat/lng");
        }
        if (drone == null) {
            throw new IllegalStateException("Drone is required for assignment");
        }

        // Cập nhật trạng thái drone
        drone.setStatus(Drone.DroneStatus.ASSIGNED);
        drone.setLastAssignedAt(LocalDateTime.now());
        droneRepository.save(drone);
        
        // Không cập nhật trạng thái order tại đây nữa
        // Việc chuyển READY_FOR_DELIVERY -> OUT_FOR_DELIVERY sẽ do OrderService xử lý
        
        // Tạo hoặc tái sử dụng delivery record để tránh vi phạm unique constraint (order_id)
        Delivery delivery = order.getDelivery();
        if (delivery == null) {
            delivery = Delivery.builder()
                    .order(order)
                    .build();
        }

        delivery.setDrone(drone);
        delivery.setStatus(Delivery.DeliveryStatus.ASSIGNED);
        delivery.setW0Lat(drone.getCurrentLat());
        delivery.setW0Lng(drone.getCurrentLng());
        delivery.setW1Lat(order.getStore().getLatitude());
        delivery.setW1Lng(order.getStore().getLongitude());
        delivery.setW2Lat(order.getAddress().getLatitude());
        delivery.setW2Lng(order.getAddress().getLongitude());
        delivery.setW3Lat(drone.getHomeLat());
        delivery.setW3Lng(drone.getHomeLng());
        delivery.setCurrentSegment("W0_W1");
        delivery.setSegmentStartTime(LocalDateTime.now());
        delivery.setEtaSeconds(calculateInitialETA());

        delivery = deliveryRepository.save(delivery);
        order.setDelivery(delivery);

        // Tạo assignment record
        DroneAssignment assignment = DroneAssignment.builder()
                .order(order)
                .drone(drone)
                .delivery(delivery)
                .assignmentMode(mode)
                .assignedBy(assignedBy)
                .assignedAt(LocalDateTime.now())
                .build();
        
        return assignmentRepository.save(assignment);
    }
    
    @Override
    public List<Drone> getAvailableDrones() {
        return droneRepository.findByStatus(Drone.DroneStatus.IDLE);
    }
    
    @Override
    public Optional<Drone> selectDroneRoundRobin(List<Drone> availableDrones) {
        if (availableDrones.isEmpty()) {
            return Optional.empty();
        }
        
        // Chọn drone có lastAssignedAt cũ nhất (hoặc null)
        return availableDrones.stream()
                .min(Comparator.comparing(drone -> 
                    drone.getLastAssignedAt() != null ? drone.getLastAssignedAt() : LocalDateTime.MIN));
    }

    private Optional<Drone> selectDroneByEta(Order order, List<Drone> availableDrones) {
        Store store = order.getStore();
        Address dest = order.getAddress();
        if (store == null || dest == null ||
                store.getLatitude() == null || store.getLongitude() == null ||
                dest.getLatitude() == null || dest.getLongitude() == null) {
            log.warn("Missing coordinates for store or destination; fallback to round-robin");
            return selectDroneRoundRobin(availableDrones);
        }

        double storeLat = store.getLatitude();
        double storeLng = store.getLongitude();

        // Khoảng cách cửa hàng -> khách hàng (đã nhân path factor)
        double dStoreToDestKm = haversineKm(storeLat, storeLng, dest.getLatitude(), dest.getLongitude()) * PATH_FACTOR;

        // Chỉ chọn drone trong bán kính dispatch quanh cửa hàng
        List<DroneCandidate> candidates = availableDrones.stream()
                .filter(d -> d.getCurrentLat() != null && d.getCurrentLng() != null)
                .map(d -> new DroneCandidate(d,
                        haversineKm(d.getCurrentLat(), d.getCurrentLng(), storeLat, storeLng)))
                .filter(dc -> dc.distanceToStoreKm() <= DISPATCH_RADIUS_KM)
                .collect(Collectors.toList());

        if (candidates.isEmpty()) {
            log.warn("No candidates within dispatch radius; fallback to round-robin");
            return selectDroneRoundRobin(availableDrones);
        }

        // wind_along = wind_speed * cos(phi) -> demo: wind_speed=0 => v_eff = clamp(V_AIR_KMH)
        double vEffKmh = clamp(V_AIR_KMH, V_MIN_KMH, V_MAX_KMH);
        double tFlightSec = (dStoreToDestKm / vEffKmh) * 3600.0; // đổi giờ -> giây
        double etaSecBase = T_QUEUE_SEC + T_OVERHEAD_SEC + tFlightSec;

        // Rank theo ETA (như nhau cho demo) và sau đó theo khoảng cách đến cửa hàng
        return candidates.stream()
                .sorted(Comparator
                        .comparingDouble((DroneCandidate dc) -> etaSecBase)
                        .thenComparingDouble(DroneCandidate::distanceToStoreKm))
                .map(DroneCandidate::drone)
                .findFirst();
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371.0; // bán kính Trái Đất (km)
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }

    private record DroneCandidate(Drone drone, double distanceToStoreKm) {}
    
    @Override
    @Transactional
    public void completeAssignment(Long assignmentId) {
        DroneAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found: " + assignmentId));
        
        // Cập nhật assignment
        assignment.setCompletedAt(LocalDateTime.now());
        assignmentRepository.save(assignment);
        
        // Đặt drone về IDLE
        Drone drone = assignment.getDrone();
        String oldStatus = drone.getStatus() != null ? drone.getStatus().name() : "UNKNOWN";
        drone.setStatus(Drone.DroneStatus.IDLE);
        droneRepository.save(drone);
        
        // Broadcast trạng thái qua tracking service để tránh phụ thuộc Controller
        try {
            droneTrackingService.notifyDroneStatusChange(
                drone.getId(),
                oldStatus,
                Drone.DroneStatus.IDLE.name()
            );
        } catch (Exception e) {
            log.warn("Failed to notify drone status change for drone {}: {}", drone.getId(), e.getMessage());
        }

        log.info("Completed assignment {} - Drone {} is now IDLE", assignmentId, drone.getId());
    }
    
    @Override
    public Optional<DroneAssignment> getCurrentAssignment(Long droneId) {
        // Use the newest active assignment to avoid NonUniqueResultException when duplicates exist
        return assignmentRepository.findTopByDroneIdAndCompletedAtIsNullOrderByAssignedAtDesc(droneId);
    }
    
    private Integer calculateInitialETA() {
        // POC: Tổng thời gian các leg theo config
        // W0→W1: 90s, W1→W2: 240s, W2→W3: 120s + dwell: 10s
        return 90 + 240 + 10; // Không tính W2→W3 trong ETA giao hàng
    }
}