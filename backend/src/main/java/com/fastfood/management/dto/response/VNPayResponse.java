package com.fastfood.management.dto.response;

import lombok.Data;

@Data
public class VNPayResponse {
    private String paymentUrl;
    private String transactionReference;
}