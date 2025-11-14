package com.fastfood.management.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class OrderStatsResponse {
    private Long storeId;
    private LocalDateTime start;
    private LocalDateTime end;

    private BigDecimal totalRevenue;
    private Long processingCount;
    private Long deliveredCount;
    private Long cancelledCount;
}