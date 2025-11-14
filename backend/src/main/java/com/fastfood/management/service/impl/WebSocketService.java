package com.fastfood.management.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Send order status update notification
     */
    public void sendOrderStatusUpdate(Long orderId, String status) {
        messagingTemplate.convertAndSend(
                "/topic/orders/" + orderId,
                new WebSocketMessage("ORDER_STATUS_CHANGED", status)
        );
        
        // Also send to kitchen topic for kitchen staff
        messagingTemplate.convertAndSend(
                "/topic/kitchen/orders",
                new WebSocketMessage("ORDER_STATUS_CHANGED", 
                        String.format("Order #%d status changed to %s", orderId, status))
        );
    }

    /**
     * Send drone GPS update notification
     */
    public void sendDroneGpsUpdate(Long orderId, double lat, double lng, double eta, 
                                  Double speedKmh, Double heading, Double batteryPct) {
        GpsUpdatePayload payload = new GpsUpdatePayload(lat, lng, eta, speedKmh, heading, batteryPct);
        messagingTemplate.convertAndSend(
                "/topic/orders/" + orderId,
                new WebSocketMessage("GPS_UPDATE", payload)
        );
    }

    /**
     * Send delivery arriving notification
     */
    public void sendDeliveryArriving(Long orderId, int estimatedMinutes) {
        messagingTemplate.convertAndSend(
                "/topic/orders/" + orderId,
                new WebSocketMessage("DELIVERY_ARRIVING", 
                        String.format("Your delivery will arrive in approximately %d minutes", estimatedMinutes))
        );
    }

    /**
     * Send admin dashboard update
     */
    public void sendAdminDashboardUpdate(Object dashboardData) {
        messagingTemplate.convertAndSend(
                "/topic/admin/dashboard",
                new WebSocketMessage("DASHBOARD_UPDATE", dashboardData)
        );
    }

    /**
     * Generic WebSocket message structure
     */
    public static class WebSocketMessage {
        private final String type;
        private final Object payload;

        public WebSocketMessage(String type, Object payload) {
            this.type = type;
            this.payload = payload;
        }

        public String getType() {
            return type;
        }

        public Object getPayload() {
            return payload;
        }
    }

    /**
     * GPS update payload structure
     */
    public static class GpsUpdatePayload {
        private final double lat;
        private final double lng;
        private final double etaMinutes;
        private final Double speedKmh;
        private final Double heading;
        private final Double batteryPct;

        public GpsUpdatePayload(double lat, double lng, double etaMinutes, 
                               Double speedKmh, Double heading, Double batteryPct) {
            this.lat = lat;
            this.lng = lng;
            this.etaMinutes = etaMinutes;
            this.speedKmh = speedKmh;
            this.heading = heading;
            this.batteryPct = batteryPct;
        }

        public double getLat() {
            return lat;
        }

        public double getLng() {
            return lng;
        }

        public double getEtaMinutes() {
            return etaMinutes;
        }

        public Double getSpeedKmh() {
            return speedKmh;
        }

        public Double getHeading() {
            return heading;
        }

        public Double getBatteryPct() {
            return batteryPct;
        }
    }
}