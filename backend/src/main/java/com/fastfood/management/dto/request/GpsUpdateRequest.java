package com.fastfood.management.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GpsUpdateRequest {
    
    @NotNull(message = "Latitude is required")
    private Double lat;
    
    @NotNull(message = "Longitude is required")
    private Double lng;
    
    private Double altitude;
    
    private Double speedKmh;
    
    private Double heading;
    
    private Double batteryPct;
}