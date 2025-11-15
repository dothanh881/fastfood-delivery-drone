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

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorsResponseFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(CorsResponseFilter.class);

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        String origin = request.getHeader("Origin");
        if (origin == null || origin.isBlank()) {
            origin = "*"; // fallback
        }

        // Log request for debugging on deployed platform
        logger.info("CORS filter invoked: method={}, uri={}, origin={}", request.getMethod(), request.getRequestURI(), origin);

        // Set permissive headers (for debugging/compatibility). In production, consider restricting origins.
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Vary", "Origin");
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
        response.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,X-Requested-With");
        response.setHeader("Access-Control-Expose-Headers", "Authorization,x-auth-token");

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            logger.info("CORS preflight request - returning 200 OK for uri={}", request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        filterChain.doFilter(servletRequest, servletResponse);
    }
}
