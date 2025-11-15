package com.fastfood.management.config;

// Cấu hình bảo mật: bật xác thực JWT cho tất cả endpoint trừ /api/auth/**

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
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
import org.springframework.web.filter.CorsFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;

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
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Allow preflight requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Cho phép endpoints auth cả khi có context-path /api
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                // Error page should be publicly accessible to avoid 403 loops
                .requestMatchers("/error").permitAll()
                .requestMatchers("/api/error").permitAll()
                // Public static resources (served via resource handler)
                .requestMatchers(HttpMethod.GET, "/images/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/images/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                // File upload endpoints
                .requestMatchers(HttpMethod.POST, "/files/**").permitAll()
                // Public menu browsing endpoints
                .requestMatchers(HttpMethod.GET, "/menu/**").permitAll()
                // Admin menu management endpoints (temporarily allow for testing)
                .requestMatchers(HttpMethod.POST, "/menu/**").permitAll()
                .requestMatchers(HttpMethod.PUT, "/menu/**").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/menu/**").permitAll()
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
                // Cho phép VNPay tạo payment và trả về (callback) không cần JWT
                .requestMatchers(HttpMethod.POST, "/payments/vnpay/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/payments/vnpay/return").permitAll()
                // Cho phép WebSocket endpoints
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/api/ws/**").permitAll()
                .anyRequest().authenticated()
            );

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

        // Use explicit allowed origins (do NOT use wildcard when allowCredentials=true)
        configuration.setAllowedOrigins(Arrays.asList(
                "https://fastfood-delivery-drone-sgu.vercel.app",
                "https://fastfood-delivery-drone-sgu.up.railway.app",
                "https://fastfood-dronedelivery.vercel.app",
                "http://localhost:3000"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        configuration.setAllowCredentials(true); // Enable credentials support
        configuration.setExposedHeaders(Arrays.asList("x-auth-token", "Authorization"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // Register a global CorsFilter with highest precedence to ensure CORS headers are present
    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistration() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        // Explicitly list known frontends (no wildcard when allowCredentials=true)
        config.setAllowedOrigins(Arrays.asList(
                "https://fastfood-delivery-drone-sgu.vercel.app",
                "https://fastfood-delivery-drone-sgu.up.railway.app",
                "https://fastfood-dronedelivery.vercel.app",
                "http://localhost:3000"
        ));
        config.setAllowCredentials(true);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        source.registerCorsConfiguration("/**", config);
        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
        bean.setOrder(0);
        return bean;
    }
}