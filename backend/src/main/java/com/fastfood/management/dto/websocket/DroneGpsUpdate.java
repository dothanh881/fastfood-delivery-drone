package com.fastfood.management.dto.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DroneGpsUpdate {
    private Long droneId;
    private Long deliveryId;
    private double latitude;
    private double longitude;
    private String currentSegment;
    private Integer etaSeconds;
    private LocalDateTime timestamp;
    private String status; // IDLE, EN_ROUTE_TO_STORE, AT_STORE, EN_ROUTE_TO_CUSTOMER, etc.
}