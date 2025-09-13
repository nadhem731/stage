package com.sys_res.esp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.sys_res.esp.util.JwtAuthenticationFilter;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, AuthenticationEntryPoint unauthorizedHandler) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/statistics", "/api/statistics/**").permitAll()
                .requestMatchers("/api/users/etudiants", "/api/users/enseignants").permitAll()
                .requestMatchers("/api/salles/**", "/api/classes/**").permitAll()
                .requestMatchers("/api/plannings/enseignant").hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMIN")
                .requestMatchers("/api/plannings/seances/enseignant").hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMIN")
                .requestMatchers("/api/plannings/status").hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMIN")
                .requestMatchers("/api/plannings/save-bulk").hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMIN")
                .requestMatchers("/api/soutenances/enseignant").hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMIN")
                .requestMatchers("/api/soutenances/seances/enseignant").hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMIN")
                .requestMatchers("/api/rattrapages/**").hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMIN")
                .requestMatchers("/api/plannings/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/soutenances/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/disponibilites/**").hasAuthority("ROLE_ENSEIGNANT")
                .requestMatchers("/api/users/*/disponibilite").hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMIN")
                .requestMatchers("/api/affectations/**").authenticated()
                .requestMatchers("/api/users/me").hasAnyAuthority("ROLE_ENSEIGNANT", "ROLE_ADMIN")
                .requestMatchers("/api/users/**").hasAuthority("ROLE_ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
        return authProvider;
    }

    @Bean
    public AuthenticationEntryPoint unauthorizedEntryPoint() {
        return (request, response, authException) -> {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
