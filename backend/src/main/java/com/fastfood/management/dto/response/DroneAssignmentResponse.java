package com.fastfood.management.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class DroneAssignmentResponse {
    private Long deliveryId;
    private Long droneId;
    private Long orderId;
    private Map<String, Double[]> waypoints; // W0, W1, W2, W3
    private Integer etaSec;
    private String status;
    private String message;
}