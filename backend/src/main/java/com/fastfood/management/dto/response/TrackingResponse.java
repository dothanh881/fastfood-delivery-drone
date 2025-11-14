package com.fastfood.management.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class TrackingResponse {
    private Long orderId;
    private String orderStatus;
    private String deliveryStatus;
    private Double currentLat;
    private Double currentLng;
    private Double destinationLat;
    private Double destinationLng;
    private Integer estimatedMinutesRemaining;
    private Double speedKmh;
    private Double batteryPct;
    private List<GpsHistoryPoint> history;
    
    @Data
    public static class GpsHistoryPoint {
        private Double lat;
        private Double lng;
        private LocalDateTime timestamp;
    }
}