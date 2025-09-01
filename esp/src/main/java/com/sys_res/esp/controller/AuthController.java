package com.sys_res.esp.controller;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken; // Add this repository
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.dto.LoginRequest;
import com.sys_res.esp.dto.SignupRequest;
import com.sys_res.esp.entity.Role;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.RoleRepository;
import com.sys_res.esp.repository.UsersRepository;
import com.sys_res.esp.util.JwtUtil;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    private final AuthenticationManager authenticationManager;
    private final UsersRepository usersRepository;
    private final RoleRepository roleRepository; // Add this repository
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(AuthenticationManager authenticationManager, UsersRepository usersRepository,
                          RoleRepository roleRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.authenticationManager = authenticationManager;
        this.usersRepository = usersRepository;
        this.roleRepository = roleRepository; // Inject RoleRepository
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/signup")
public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest signupRequest) {
    logger.info("SignupRequest identifiant: {}", signupRequest.getIdentifiant());
    logger.info("Received signup request for email: {}", signupRequest.getEmail());
    
    try {
        if (usersRepository.findByEmail(signupRequest.getEmail()).isPresent()) {
            logger.warn("Email already exists: {}", signupRequest.getEmail());
            Map<String, String> error = new HashMap<>();
            error.put("message", "Email already exists");
            return ResponseEntity.badRequest().body(error);
        }

        // Forcer le rôle par défaut à "Admin" pour tous les nouveaux utilisateurs
        String defaultRole = "Admin";
        logger.info("Setting default role to: {}", defaultRole);
        
        // Vérifier si le rôle Admin existe, sinon le créer
        Role role = roleRepository.findById(defaultRole)
                .orElseGet(() -> {
                    logger.info("Role not found in database, creating new role: {}", defaultRole);
                    try {
                        Role newRole = new Role();
                        newRole.setTypeRole(defaultRole);
                        Role savedRole = roleRepository.save(newRole);
                        logger.info("New role created successfully: {}", savedRole.getTypeRole());
                        return savedRole;
                    } catch (Exception roleError) {
                        logger.error("Error creating role {}: {}", defaultRole, roleError.getMessage());
                        // Si on ne peut pas créer le rôle, essayer de le récupérer à nouveau
                        return roleRepository.findById(defaultRole)
                                .orElseThrow(() -> new RuntimeException("Role not found and could not be created: " + defaultRole));
                    }
                });
        
        logger.info("Using existing role: {}", role.getTypeRole());

        logger.info("Creating user with email: {}", signupRequest.getEmail());
        Users user = new Users();
        user.setNom(signupRequest.getNom());
        user.setPrenom(signupRequest.getPrenom());
        user.setEmail(signupRequest.getEmail());
        user.setTel(signupRequest.getTel());
        user.setIdentifiant(signupRequest.getIdentifiant());
        // Le mot de passe est toujours égal au cin, encodé
        user.setPassword(passwordEncoder.encode(signupRequest.getPassword()));
        user.setCin(signupRequest.getCin());
        user.setMatiere(signupRequest.getMatiere());
        user.setRole(role);

        logger.info("Saving user to database");
        try {
            usersRepository.save(user);
            logger.info("User saved successfully with ID: {}", user.getIdUser());
        } catch (Exception saveError) {
            logger.error("Error saving user: {}", saveError.getMessage(), saveError);
            throw saveError;
        }

        try {
            logger.info("Generating JWT token for user: {}", user.getIdentifiant());
            String token = jwtUtil.generateToken(user.getIdentifiant(), role.getTypeRole(), user.getIdUser());
            logger.info("JWT token generated successfully");
            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            logger.info("Signup successful for user: {}", user.getEmail());
            return ResponseEntity.ok(response);
        } catch (Exception jwtError) {
            logger.error("JWT generation error: {}", jwtError.getMessage(), jwtError);
            // Au lieu d'échouer, retourner un succès sans token
            Map<String, String> response = new HashMap<>();
            response.put("message", "User created successfully. Please login.");
            logger.info("Signup successful for user: {} (without token)", user.getEmail());
            return ResponseEntity.ok(response);
        }
    } catch (Exception e) {
        logger.error("Error during signup for email {}: {}", signupRequest.getEmail(), e.getMessage(), e);
        Map<String, String> error = new HashMap<>();
        // Gestion spécifique des erreurs de contrainte
        if (e.getMessage().contains("role_type_role_check")) {
            logger.error("Role constraint violation for role: {}", signupRequest.getRoleTypeRole());
            error.put("message", "Role type not allowed. Please use: Etudiant, Enseignant, or Admin (exact spelling)");
        } else if (e.getMessage().contains("duplicate key")) {
            error.put("message", "Email already exists");
        } else {
            error.put("message", "Error creating user: " + e.getMessage());
        }
        
        return ResponseEntity.status(500).body(error);
    }
}

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            logger.info("Login attempt for identifiant: {}", loginRequest.getIdentifiant());
            
            // Vérifier si l'utilisateur existe d'abord
            Users user = usersRepository.findByIdentifiant(loginRequest.getIdentifiant())
                    .orElse(null);
            
            if (user == null) {
                logger.warn("User not found for identifiant: {}", loginRequest.getIdentifiant());
                Map<String, String> error = new HashMap<>();
                error.put("message", "Invalid credentials");
                return ResponseEntity.status(401).body(error);
            }
            
            // Vérifier le statut du compte
            if (!"ACTIF".equals(user.getStatusCompte())) {
                logger.warn("Account not active for user: {} - Status: {}", user.getIdentifiant(), user.getStatusCompte());
                Map<String, String> error = new HashMap<>();
                error.put("message", "Compte " + user.getStatusCompte().toLowerCase() + ". Contactez l'administrateur.");
                return ResponseEntity.status(401).body(error);
            }
            
            logger.info("User found, attempting authentication");
            
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getIdentifiant(), loginRequest.getPassword())
            );

            String roleType = user.getRole() != null ? user.getRole().getTypeRole() : "User";
            logger.info("Generating token for user: {} with role: {}", user.getIdentifiant(), roleType);
            
            String token = jwtUtil.generateToken(user.getIdentifiant(), roleType, user.getIdUser());
            
            logger.info("Login successful for user: {}", user.getIdentifiant());
            return ResponseEntity.ok(new AuthResponse(token, user.getIdentifiant(), roleType, user.getNom(), user.getPrenom(), user.getTel(), user.getCin(), user.getEmail(), user.getMatiere()));
        } catch (Exception e) {
            logger.error("Login failed for identifiant {}: {}", loginRequest.getIdentifiant(), e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Invalid credentials");
            return ResponseEntity.status(401).body(error);
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String identifiant = authentication.getName();
            
            Users user = usersRepository.findByIdentifiant(identifiant)
                    .orElse(null);
            
            if (user == null) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "User not found");
                return ResponseEntity.status(404).body(error);
            }
            
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", user.getIdUser());
            userInfo.put("idUser", user.getIdUser());
            userInfo.put("email", user.getEmail());
            userInfo.put("nom", user.getNom());
            userInfo.put("prenom", user.getPrenom());
            userInfo.put("tel", user.getTel());
            userInfo.put("cin", user.getCin());
            userInfo.put("identifiant", user.getIdentifiant());
            userInfo.put("matiere", user.getMatiere());
            userInfo.put("imageUrl", user.getImageUrl());
            userInfo.put("statusCompte", user.getStatusCompte());
            userInfo.put("role", user.getRole() != null ? user.getRole().getTypeRole() : "User");
            
            return ResponseEntity.ok(userInfo);
        } catch (Exception e) {
            logger.error("Error getting current user: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Error retrieving user information");
            return ResponseEntity.status(500).body(error);
        }
    }
}

class AuthResponse {
    private final String token;
    private final String email;
    private final String role;
    private final String nom;
    private final String prenom;
    private final String tel;
    private final String cin;
    private final String identifiant;
    private final String matiere;

    public AuthResponse(String token, String identifiant, String role, String nom, String prenom, String tel, String cin, String email, String matiere) {
        this.token = token;
        this.identifiant = identifiant;
        this.role = role;
        this.nom = nom;
        this.prenom = prenom;
        this.tel = tel;
        this.cin = cin;
        this.email = email;
        this.matiere = matiere;
    }

    public String getToken() {
        return token;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public String getNom() {
        return nom;
    }

    public String getPrenom() {
        return prenom;
    }

    public String getTel() {
        return tel;
    }

    public String getCin() {
        return cin;
    }

    public String getIdentifiant() {
        return identifiant;
    }

    public String getMatiere() {
        return matiere;
    }
}
