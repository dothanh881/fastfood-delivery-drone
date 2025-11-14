package com.fastfood.management.dto.request;

import lombok.Data;

@Data
public class DroneAssignmentRequest {
    private Long orderId;
    private Long droneId;
    // Cờ yêu cầu bắt đầu mô phỏng ngay sau khi gán
    private boolean start;
}