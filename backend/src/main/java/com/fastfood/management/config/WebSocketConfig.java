package com.fastfood.management.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Cấu hình WebSocket STOMP cho drone delivery POC
 * 
 * Endpoints:
 * - /ws: WebSocket connection endpoint
 * 
 * Topics:
 * - /topic/drone/{droneId}/gps: GPS updates cho drone cụ thể
 * - /topic/drone/{droneId}/state: State changes cho drone cụ thể  
 * - /topic/delivery/{deliveryId}/eta: ETA updates cho delivery cụ thể
 * - /topic/delivery/{deliveryId}/events: Delivery events
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.websocket.path:/ws}")
    private String websocketPath;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Bật simple broker cho các topic và queue
        registry.enableSimpleBroker("/topic", "/queue");
        
        // Prefix cho các message từ client
        registry.setApplicationDestinationPrefixes("/app");
        
        // User-specific destinations
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Đăng ký WebSocket endpoint với SockJS fallback
        registry.addEndpoint(websocketPath)
                .setAllowedOriginPatterns("*")
                .withSockJS();
        
        // Endpoint không có SockJS cho native WebSocket clients
        registry.addEndpoint(websocketPath)
                .setAllowedOriginPatterns("*");
    }
}