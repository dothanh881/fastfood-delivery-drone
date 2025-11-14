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
public class DroneStateChange {
    private Long droneId;
    private Long deliveryId;
    private String oldStatus;
    private String newStatus;
    private String currentSegment;
    private String message;
    private LocalDateTime timestamp;
}