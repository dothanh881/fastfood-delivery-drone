package com.fastfood.management.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();
    private final List<String> excludedPaths = Arrays.asList(
        "/auth/**", "/api/auth/**", "/public/**", "/payments/vnpay/**", "/ws/**", "/api/ws/**", "/drone-management/**", "/deliveries/**", "/drone-tracking/**"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (isExcluded(request)) {
            logger.debug("[JWT] Excluded path, skipping JWT filter: " + request.getRequestURI());
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String bearer = request.getHeader("Authorization");
            if (!StringUtils.hasText(bearer)) {
                logger.info("[JWT] No Authorization header present for request: " + request.getRequestURI());
            } else {
                logger.info("[JWT] Authorization header present (masked): " + (bearer.length() > 20 ? bearer.substring(0, 20) + "..." : bearer));
            }

            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                Authentication authentication = tokenProvider.getAuthentication(jwt);
                SecurityContextHolder.getContext().setAuthentication(authentication);
                logger.info("[JWT] Authentication set for user: " + (authentication.getName()));
                try {
                    logger.info("[JWT] Authorities: " + authentication.getAuthorities());
                } catch (Exception ignored) { }
            } else if (StringUtils.hasText(jwt)) {
                logger.info("[JWT] JWT token present but invalid for request: " + request.getRequestURI());
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private boolean isExcluded(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        String path = (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath))
                ? uri.substring(contextPath.length())
                : uri;
        boolean match = excludedPaths.stream().anyMatch(p -> pathMatcher.match(p, path));
        logger.debug(String.format("[JWT] isExcluded check: uri=%s, contextPath=%s, resolvedPath=%s, match=%s", uri, contextPath, path, match));
        return match;
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}