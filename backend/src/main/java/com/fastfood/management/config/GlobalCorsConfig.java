package com.fastfood.management.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class GlobalCorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(
                        "https://fastfood-delivery-drone-sgu.vercel.app",
                        "https://fastfood-delivery-drone-sgu.up.railway.app",
                        "https://fastfood-dronedelivery.vercel.app",
                        "https://*.vercel.app",  // Allow all Vercel preview deployments
                        "http://localhost:3000",
                        "http://localhost:*"  // Allow any local port
                )
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization", "x-auth-token")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
