package com.fastfood.management.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
@ConfigurationProperties(prefix = "drone.poc")
@Data
public class DroneConfig {
    
    // GPS tick interval in seconds
    private int gpsTickSec = 5;
    
    // Dwell time at customer location in seconds
    private int dwellSecCustomer = 10;
    
    // Assignment mode: AUTO or MANUAL
    private String assignMode = "AUTO";
    
    // Leg durations in seconds for each segment
    private Map<String, Integer> legDurationSec = Map.of(
        "W0_W1", 90,   // Drone to Store: 1.5 minutes
        "W1_W2", 240,  // Store to Customer: 4 minutes  
        "W2_W3", 120   // Customer to Base: 2 minutes
    );
    
    // Calculated dwell ticks
    public int getDwellTicks() {
        return dwellSecCustomer / gpsTickSec;
    }
    
    // Get duration for specific segment
    public int getLegDuration(String segment) {
        return legDurationSec.getOrDefault(segment, 60);
    }
    
    // Calculate total ETA for delivery (excluding return to base)
    public int calculateDeliveryETA() {
        return legDurationSec.get("W0_W1") + legDurationSec.get("W1_W2") + dwellSecCustomer;
    }
}