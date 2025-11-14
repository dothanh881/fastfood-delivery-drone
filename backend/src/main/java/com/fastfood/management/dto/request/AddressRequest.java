package com.fastfood.management.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class AddressRequest {
    
    @NotBlank(message = "Receiver name is required")
    private String receiverName;
    
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10,11}$", message = "Phone number must be 10-11 digits")
    private String phone;
    
    @NotBlank(message = "Address line 1 is required")
    private String line1;
    
    private String ward;
    
    private String district;
    
    @NotBlank(message = "City is required")
    private String city;
    
    private Double lat;
    
    private Double lng;
    
    private boolean isDefault = false;
}