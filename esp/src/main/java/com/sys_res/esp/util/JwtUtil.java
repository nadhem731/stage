package com.sys_res.esp.util;

import java.security.Key;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    private Key getSigningKey() {
        byte[] keyBytes = secret.getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(String identifiant, String role) {
        // Assurez-vous que le rôle est préfixé par "ROLE_" et en majuscules pour Spring Security
        String formattedRole = "ROLE_" + role.toUpperCase();
        return Jwts.builder()
                .setSubject(identifiant)
                .claim("role", formattedRole) // Stocke le rôle formaté
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateToken(String identifiant, String role, Long userId) {
        // Assurez-vous que le rôle est préfixé par "ROLE_" et en majuscules pour Spring Security
        String formattedRole = "ROLE_" + role.toUpperCase();
        return Jwts.builder()
                .setSubject(identifiant)
                .claim("role", formattedRole) // Stocke le rôle formaté
                .claim("userId", userId) // Ajouter l'ID utilisateur
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String getIdentifiantFromToken(String token) {
        return getAllClaimsFromToken(token).getSubject();
    }

    // Ajout de la méthode manquante pour extraire tous les claims du token
    public Claims getAllClaimsFromToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("role", String.class);
    }

    public Long extractUserId(String token) {
        Claims claims = getAllClaimsFromToken(token);
        return claims.get("userId", Long.class);
    }

    public String extractRole(String token) {
        return getRoleFromToken(token);
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        final String identifiant = getIdentifiantFromToken(token);
        return (identifiant.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    private boolean isTokenExpired(String token) {
        return getAllClaimsFromToken(token).getExpiration().before(new Date());
    }
}
