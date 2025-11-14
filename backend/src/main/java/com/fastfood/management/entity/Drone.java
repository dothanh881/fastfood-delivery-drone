package com.fastfood.management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "drones")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Drone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String serial;

    private String model;

    @Column(name = "max_payload_kg")
    private Double maxPayloadKg;

    @Column(name = "max_range_km")
    private Double maxRangeKm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DroneStatus status = DroneStatus.IDLE;

    @Column(name = "home_lat")
    private Double homeLat;

    @Column(name = "home_lng")
    private Double homeLng;

    @Column(name = "battery_pct")
    private Double batteryPct;

    @Column(name = "current_lat")
    private Double currentLat;

    @Column(name = "current_lng")
    private Double currentLng;

    @Column(name = "last_assigned_at")
    private LocalDateTime lastAssignedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    public enum DroneStatus {
        OFFLINE,              // Drone không hoạt động
        IDLE,                 // Drone rảnh, sẵn sàng nhận nhiệm vụ
        ASSIGNED,             // Drone được gán đơn hàng
        EN_ROUTE_TO_STORE,    // Drone đang bay đến cửa hàng (W0→W1)
        AT_STORE,             // Drone đang ở cửa hàng (pickup)
        EN_ROUTE_TO_CUSTOMER, // Drone đang bay đến khách hàng (W1→W2)
        ARRIVING,             // Drone đang tiếp cận khách hàng
        RETURN_TO_BASE,       // Drone đang quay về base (W2→W3)
        MAINTENANCE           // Drone đang bảo trì
    }

    // Custom getter for compatibility
    public String getSerialNumber() {
        return this.serial;
    }
}