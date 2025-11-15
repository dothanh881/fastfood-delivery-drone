package com.fastfood.management.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorsResponseFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(CorsResponseFilter.class);

    // List of allowed origins - support wildcard matching
    private static final List<String> ALLOWED_ORIGIN_PATTERNS = Arrays.asList(
            "https://fastfood-delivery-drone-sgu.vercel.app",
            "https://fastfood-delivery-drone.onrender.com",
            "https://fastfood-dronedelivery.vercel.app",
            "http://localhost:3000"
    );

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String origin = request.getHeader("Origin");

        // Log request for debugging on deployed platform
        logger.info("CORS filter invoked: method={}, uri={}, origin={}", request.getMethod(), request.getRequestURI(), origin);

        // Log POST requests specially to debug login issues
        if ("POST".equalsIgnoreCase(request.getMethod())) {
            logger.warn("POST request detected: uri={}, origin={}, contentType={}",
                request.getRequestURI(), origin, request.getContentType());
        }

        // Only set CORS headers if origin is present and allowed
        if (origin != null && !origin.isBlank()) {
            // Check if origin is allowed (exact match or Vercel/localhost pattern match)
            if (isOriginAllowed(origin)) {
                response.setHeader("Access-Control-Allow-Origin", origin);
                response.setHeader("Vary", "Origin");
                response.setHeader("Access-Control-Allow-Credentials", "true");
                response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
                response.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,X-Requested-With");
                response.setHeader("Access-Control-Expose-Headers", "Authorization,x-auth-token");
            } else {
                logger.warn("Origin not allowed: {}", origin);
            }
        }

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            logger.info("CORS preflight request - returning 200 OK for uri={}", request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        try {
            filterChain.doFilter(servletRequest, servletResponse);
        } catch (Exception e) {
            logger.error("Exception in filter chain: uri={}, method={}, error={}",
                request.getRequestURI(), request.getMethod(), e.getMessage(), e);
            throw e;
        }
    }

    // Check if origin matches allowed patterns
    private boolean isOriginAllowed(String origin) {
        if (origin == null) return false;

        // Check exact matches first
        if (ALLOWED_ORIGIN_PATTERNS.contains(origin)) {
            return true;
        }

        // Allow all Vercel deployments
        if (origin.endsWith(".vercel.app")) {
            return true;
        }

        // Allow all localhost with any port
        if (origin.startsWith("http://localhost:") || origin.equals("http://localhost")) {
            return true;
        }

        return false;
    }
}
