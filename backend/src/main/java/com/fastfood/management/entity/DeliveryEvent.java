package com.fastfood.management.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "delivery_events",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_de_delivery_nonce", columnNames = {"delivery_id", "nonce"})
        },
        indexes = {
                @Index(name = "idx_de_delivery_ts", columnList = "delivery_id, ts")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryEvent {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "delivery_id")
    private Delivery delivery;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private EventType eventType;
    
    private Double lat;
    
    private Double lng;
    
    @Column(name = "speed_kmh")
    private Double speedKmh;
    
    private Double heading;
    
    @Column(name = "battery_pct")
    
    private Double batteryPct;
    
    @Column(nullable = false)
    private LocalDateTime ts;
    
    @Column(length = 64)
    private String nonce;

    @Column(length = 500)
    private String note;

    public enum EventType {
        DELIVERY_START, GPS_UPDATE, DELIVERY_COMPLETE, ERROR
    }
}