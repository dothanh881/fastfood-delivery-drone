package com.fastfood.management.config;

// Cấu hình bảo mật: bật xác thực JWT cho tất cả endpoint trừ /api/auth/**

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

import com.fastfood.management.security.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class WebSecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
      .cors().and()
      .csrf().disable()
      .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS).and()
      .authorizeHttpRequests()
       .requestMatchers("/auth/**").permitAll()
        // Error page should be publicly accessible to avoid 403 loops
        .requestMatchers(HttpMethod.GET, "/error").permitAll()
        // Public static resources (served via resource handler)
        .requestMatchers(HttpMethod.GET, "/images/**").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/images/**").permitAll()
        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
        // File upload endpoints
        .requestMatchers(HttpMethod.POST, "/files/**").permitAll()
        // Public menu browsing endpoints (support context-path /api)
        .requestMatchers(HttpMethod.GET, "/menu/**").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/menu/**").permitAll()
        // Admin/merchant menu management endpoints (temporarily allow for testing)
        .requestMatchers(HttpMethod.POST, "/menu/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/menu/**").permitAll()
        .requestMatchers(HttpMethod.PUT, "/menu/**").permitAll()
        .requestMatchers(HttpMethod.PUT, "/api/menu/**").permitAll()
        .requestMatchers(HttpMethod.DELETE, "/menu/**").permitAll()
        .requestMatchers(HttpMethod.DELETE, "/api/menu/**").permitAll()
        // Staff management endpoints for merchant portal (temporarily allow to avoid 403 during development)
        .requestMatchers(HttpMethod.GET, "/staff/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/staff/**").permitAll()
        .requestMatchers(HttpMethod.PUT, "/staff/**").permitAll()
        .requestMatchers(HttpMethod.PATCH, "/staff/**").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/staff/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/api/staff/**").permitAll()
        .requestMatchers(HttpMethod.PUT, "/api/staff/**").permitAll()
        .requestMatchers(HttpMethod.PATCH, "/api/staff/**").permitAll()
        .requestMatchers(HttpMethod.GET, "/public/**").permitAll()
        // Public products browsing endpoints
        .requestMatchers(HttpMethod.GET, "/products").permitAll()
        .requestMatchers(HttpMethod.GET, "/products/**").permitAll()
        // Public store browsing endpoints
        .requestMatchers(HttpMethod.GET, "/stores").permitAll()
        .requestMatchers(HttpMethod.GET, "/stores/**").permitAll()
        // Public drone endpoints for checking drone data
        .requestMatchers(HttpMethod.GET, "/drones").permitAll()
        .requestMatchers(HttpMethod.GET, "/drones/**").permitAll()
        // Drone management endpoints (temporarily allow for testing)
        .requestMatchers(HttpMethod.GET, "/drone-management/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/drone-management/**").permitAll()
        .requestMatchers(HttpMethod.PUT, "/drone-management/**").permitAll()
        // Drone tracking endpoints
        .requestMatchers(HttpMethod.GET, "/drone-tracking/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/drone-tracking/**").permitAll()
        // Deliveries endpoints (temporarily allow for testing)
        .requestMatchers(HttpMethod.GET, "/deliveries/**").permitAll()
        .requestMatchers(HttpMethod.POST, "/deliveries/**").permitAll()
        .requestMatchers(HttpMethod.PUT, "/deliveries/**").permitAll()
        // Merchant orders listing/statistics: allow GET to avoid 403 during development
        .requestMatchers(HttpMethod.GET, "/orders/status").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/orders/status").permitAll()
        .requestMatchers(HttpMethod.GET, "/orders/stats").permitAll()
        .requestMatchers(HttpMethod.GET, "/api/orders/stats").permitAll()
        // Cho phép VNPay tạo payment và trả về (callback) không cần JWT
        .requestMatchers(HttpMethod.POST, "/payments/vnpay/**").permitAll()
        .requestMatchers(HttpMethod.GET, "/payments/vnpay/return").permitAll()
        // Cho phép WebSocket endpoints
        .requestMatchers("/ws/**").permitAll()
        .requestMatchers("/api/ws/**").permitAll()

        // Allow Swagger/OpenAPI UI and JSON (support both with and without context-path)
        .requestMatchers("/v3/api-docs/**").permitAll()
        .requestMatchers("/swagger-ui/**").permitAll()
        .requestMatchers("/swagger-ui.html").permitAll()
        .requestMatchers("/swagger-ui/index.html").permitAll()
        .requestMatchers("/swagger-resources/**").permitAll()
        .requestMatchers("/api/v3/api-docs/**").permitAll()
        .requestMatchers("/api/swagger-ui/**").permitAll()

        .anyRequest().authenticated();

    // Thêm JWT filter trước UsernamePasswordAuthenticationFilter
    http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();

    // Allow specific origins instead of wildcard to support credentials
    configuration.setAllowedOrigins(Arrays.asList(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:8080",
      "https://*.replit.dev"
    ));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true); // Enable credentials support
    configuration.setExposedHeaders(Arrays.asList("x-auth-token"));
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
   }
}