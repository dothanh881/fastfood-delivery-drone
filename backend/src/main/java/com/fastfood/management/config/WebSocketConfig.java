package com.fastfood.management.config;

/**
 * Cấu hình WebSocket STOMP cho drone delivery POC - DISABLED to save memory on Railway
 */
//@Configuration
//@EnableWebSocketMessageBroker
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