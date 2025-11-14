package com.fastfood.management.controller;

import com.fastfood.management.dto.websocket.DeliveryEtaUpdate;
import com.fastfood.management.dto.websocket.DroneGpsUpdate;
import com.fastfood.management.dto.websocket.DroneStateChange;
import com.fastfood.management.entity.Delivery;
import com.fastfood.management.entity.Drone;
import com.fastfood.management.repository.DeliveryRepository;
import com.fastfood.management.repository.DroneRepository;
import com.fastfood.management.service.api.DroneSimulator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * WebSocket Controller cho drone delivery realtime communication
 * 
 * Message Mappings:
 * - /app/drone/{droneId}/subscribe: Subscribe to drone updates
 * - /app/delivery/{deliveryId}/subscribe: Subscribe to delivery updates
 * 
 * Topics:
 * - /topic/drone/{droneId}/gps: GPS updates
 * - /topic/drone/{droneId}/state: State changes
 * - /topic/delivery/{deliveryId}/eta: ETA updates
 */
@Controller
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DroneWebSocketController {
    
    private final SimpMessagingTemplate messagingTemplate;
    private final DroneRepository droneRepository;
    private final DeliveryRepository deliveryRepository;
    private final DroneSimulator droneSimulator;
    
    /**
     * Subscribe to drone GPS updates
     */
    @MessageMapping("/drone/{droneId}/subscribe")
    @SendTo("/topic/drone/{droneId}/gps")
    public DroneGpsUpdate subscribeToDroneGps(@DestinationVariable Long droneId) {
        log.info("Client subscribed to drone {} GPS updates", droneId);
        
        Drone drone = droneRepository.findById(droneId).orElse(null);
        if (drone == null) {
            return null;
        }
        
        return DroneGpsUpdate.builder()
                .droneId(droneId)
                .latitude(drone.getCurrentLat())
                .longitude(drone.getCurrentLng())
                .status(drone.getStatus().toString())
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    /**
     * Subscribe to delivery ETA updates
     */
    @MessageMapping("/delivery/{deliveryId}/subscribe")
    @SendTo("/topic/delivery/{deliveryId}/eta")
    public DeliveryEtaUpdate subscribeToDeliveryEta(@DestinationVariable Long deliveryId) {
        log.info("Client subscribed to delivery {} ETA updates", deliveryId);
        
        Delivery delivery = deliveryRepository.findById(deliveryId).orElse(null);
        if (delivery == null) {
            return null;
        }
        
        return DeliveryEtaUpdate.builder()
                .deliveryId(deliveryId)
                .orderId(delivery.getOrder().getId())
                .droneId(delivery.getDrone().getId())
                .etaSeconds(delivery.getEtaSeconds())
                .currentSegment(delivery.getCurrentSegment())
                .timestamp(LocalDateTime.now())
                .build();
    }
    
    /**
     * Broadcast GPS update to all subscribers
     */
    public void broadcastGpsUpdate(DroneGpsUpdate gpsUpdate) {
        String topic = "/topic/drone/" + gpsUpdate.getDroneId() + "/gps";
        messagingTemplate.convertAndSend(topic, gpsUpdate);
        log.debug("Broadcasted GPS update to {}: lat={}, lng={}", 
                topic, gpsUpdate.getLatitude(), gpsUpdate.getLongitude());
    }
    
    /**
     * Broadcast state change to all subscribers
     */
    public void broadcastStateChange(DroneStateChange stateChange) {
        String topic = "/topic/drone/" + stateChange.getDroneId() + "/state";
        messagingTemplate.convertAndSend(topic, stateChange);
        log.info("Broadcasted state change to {}: {} -> {}", 
                topic, stateChange.getOldStatus(), stateChange.getNewStatus());
    }
    
    /**
     * Broadcast ETA update to all subscribers
     */
    public void broadcastEtaUpdate(DeliveryEtaUpdate etaUpdate) {
        String topic = "/topic/delivery/" + etaUpdate.getDeliveryId() + "/eta";
        messagingTemplate.convertAndSend(topic, etaUpdate);
        log.debug("Broadcasted ETA update to {}: {} seconds", 
                topic, etaUpdate.getEtaSeconds());
    }
    
    /**
     * Get all active deliveries for dashboard
     */
    @MessageMapping("/dashboard/active-deliveries")
    @SendTo("/topic/dashboard/deliveries")
    public Map<String, Object> getActiveDeliveries() {
        List<Delivery> activeDeliveries = deliveryRepository.findByStatus(Delivery.DeliveryStatus.IN_PROGRESS);
        
        return Map.of(
            "activeCount", activeDeliveries.size(),
            "deliveries", activeDeliveries,
            "timestamp", LocalDateTime.now()
        );
    }
}