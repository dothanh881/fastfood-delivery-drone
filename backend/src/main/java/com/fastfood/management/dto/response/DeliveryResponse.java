package com.fastfood.management.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DeliveryResponse {
    private Long id;
    private Long orderId;
    private Long droneId;
    private String status;
    private Double startLat;
    private Double startLng;
    private Double destLat;
    private Double destLng;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private GpsPositionResponse currentPosition;
    
    @Data
    public static class GpsPositionResponse {
        private Double lat;
        private Double lng;
        private Double altitude;
        private Double speedKmh;
        private Double heading;
        private Double batteryPct;
        private LocalDateTime timestamp;
    }
}