package com.fastfood.management.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PaymentResponse {
    private Long id;
    private Long orderId;
    private String provider;
    private BigDecimal amount;
    private String transactionReference;
    private String status;
    private LocalDateTime createdAt;
}