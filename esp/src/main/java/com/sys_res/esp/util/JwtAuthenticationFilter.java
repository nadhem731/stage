package com.sys_res.esp.util;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import com.sys_res.esp.service.UserDetailsServiceImpl;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final AntPathMatcher antPathMatcher = new AntPathMatcher();

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserDetailsServiceImpl userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        String token = null;
        String identifiant = null;

        logger.info("Processing request for URI: {}", request.getRequestURI());

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
            logger.info("JWT Token found: {}", token);
            try {
                identifiant = jwtUtil.getIdentifiantFromToken(token);
                logger.info("Identifiant from token: {}", identifiant);
            } catch (Exception e) {
                logger.error("Error extracting identifiant from token: {}", e.getMessage());
            }
        } else {
            logger.warn("Authorization header not found or does not start with Bearer");
        }

        if (identifiant != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = userDetailsService.loadUserByUsername(identifiant);
                if (userDetails != null) {
                    logger.info("User details loaded for identifiant: {}", identifiant);
                    logger.info("User authorities: {}", userDetails.getAuthorities());
                    
                    if (jwtUtil.validateToken(token, userDetails)) {
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                        logger.info("Authentication successful for user: {} with authorities: {}", identifiant, userDetails.getAuthorities());
                    } else {
                        logger.warn("JWT Token validation failed for user: {}", identifiant);
                    }
                } else {
                    logger.warn("User details not found for identifiant: {}", identifiant);
                }
            } catch (Exception e) {
                logger.error("Error during authentication process: {}", e.getMessage(), e);
            }
        } else if (identifiant == null) {
            logger.warn("Identifiant is null, skipping authentication for URI: {}", request.getRequestURI());
        } else {
            logger.info("User already authenticated: {}", SecurityContextHolder.getContext().getAuthentication().getName());
        }
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        // Exclure uniquement les chemins de login et signup du filtre JWT
        return antPathMatcher.match("/api/auth/login", path) || 
               antPathMatcher.match("/api/auth/signup", path);
    }
}
