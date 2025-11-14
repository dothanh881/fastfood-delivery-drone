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
public class DeliveryEtaUpdate {
    private Long deliveryId;
    private Long orderId;
    private Long droneId;
    private Integer etaSeconds;
    private String currentSegment;
    private double progressPercent; // 0.0 - 100.0
    private LocalDateTime estimatedArrival;
    private LocalDateTime timestamp;
}