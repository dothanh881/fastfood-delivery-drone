package com.fastfood.management.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PaymentRequest {
    
    @NotBlank(message = "Return URL is required")
    private String returnUrl;
    
    private String ipAddress;
    
    private String locale;
}