package com.sys_res.esp.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import com.sys_res.esp.util.JwtUtil;
import java.io.IOException;

import java.util.Map;
import java.util.HashMap;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.service.UsersService;
import com.sys_res.esp.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/users")
public class UsersController {

    private final UsersService usersService;
    private final EmailService emailService;
    private final JwtUtil jwtUtil;

    @Autowired
    public UsersController(UsersService usersService, EmailService emailService, JwtUtil jwtUtil) {
        this.usersService = usersService;
        this.emailService = emailService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    public List<Users> getAll(@RequestParam(required = false) String role) {
        if (role != null && !role.isEmpty()) {
            System.out.println("DEBUG: Requête pour récupérer les utilisateurs avec rôle: " + role);
            List<Users> users = usersService.findByRole(role);
            System.out.println("DEBUG: Nombre d'utilisateurs trouvés: " + users.size());
            return users;
        } else {
            return usersService.findAll();
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        try {
            // Extract token from Authorization header
            String token = authHeader.substring(7); // Remove 'Bearer ' prefix
            // Get user ID from token
            Long userId = jwtUtil.extractUserId(token);
            
            // Find the user
            Users user = usersService.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            // Ensure imageUrl and statusCompte are included in the response
            Map<String, Object> response = new HashMap<>();
            response.put("idUser", user.getIdUser());
            response.put("nom", user.getNom());
            response.put("prenom", user.getPrenom());
            response.put("email", user.getEmail());
            response.put("tel", user.getTel());
            response.put("identifiant", user.getIdentifiant());
            response.put("cin", user.getCin());
            response.put("matiere", user.getMatiere());
            response.put("role", user.getRole() != null ? user.getRole().getTypeRole() : null);
            response.put("imageUrl", user.getImageUrl());
            response.put("statusCompte", user.getStatusCompte());
                
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la récupération du profil", "message", e.getMessage()));
        }
    }
    
    @GetMapping("/admins")
    public List<Users> getAdmins() {
        // Essayer différentes variantes du rôle admin
        List<Users> admins = usersService.findByRole("admin");
        if (admins.isEmpty()) {
            System.out.println("DEBUG: Aucun admin trouvé avec 'admin', essai avec 'Admin'");
            admins = usersService.findByRole("Admin");
        }
        if (admins.isEmpty()) {
            System.out.println("DEBUG: Aucun admin trouvé avec 'Admin', essai avec 'ADMIN'");
            admins = usersService.findByRole("ADMIN");
        }
        
        // Masquer les mots de passe pour la sécurité
        for (Users admin : admins) {
            admin.setPassword(null);
        }
        
        System.out.println("DEBUG: Récupération de " + admins.size() + " administrateurs");
        return admins;
    }


    @GetMapping("/{id}")
    public Optional<Users> getById(@PathVariable Long id) {
        return usersService.findById(id);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Users user) {
        try {
            // Debug: Vérifier les données reçues du frontend
            System.out.println("DEBUG: Données reçues du frontend:");
            System.out.println("  - Nom: " + user.getNom());
            System.out.println("  - Prénom: " + user.getPrenom());
            System.out.println("  - Email: " + user.getEmail());
            System.out.println("  - Identifiant: " + user.getIdentifiant());
            System.out.println("  - CIN: " + user.getCin());
            System.out.println("  - Matière: " + user.getMatiere());
            System.out.println("  - Téléphone: " + user.getTel());
            System.out.println("  - Rôle: " + (user.getRole() != null ? user.getRole().getTypeRole() : "null"));
            
            // Sauvegarder le mot de passe en clair avant le hashage pour l'email
            String plainPassword = user.getPassword();
            
            // Sauvegarder l'utilisateur (le mot de passe sera hashé par le service)
            Users savedUser = usersService.save(user);
            
            // Debug: Vérifier les données après sauvegarde
            System.out.println("DEBUG: Utilisateur sauvegardé avec ID: " + savedUser.getIdUser());
            
            // Envoyer l'email de bienvenue avec les identifiants (en arrière-plan)
            try {
                emailService.sendWelcomeEmailToNewUser(savedUser, plainPassword);
                System.out.println("DEBUG: Email de bienvenue déclenché pour " + savedUser.getEmail());
            } catch (Exception e) {
                System.err.println("Erreur lors de l'envoi de l'email de bienvenue: " + e.getMessage());
                // L'erreur d'email ne doit pas empêcher la création de l'utilisateur
            }
            
            System.out.println("DEBUG: Retour de la réponse au frontend");
            return ResponseEntity.ok(savedUser);
            
        } catch (Exception e) {
            System.err.println("ERREUR lors de la création de l'utilisateur: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la création", "message", e.getMessage()));
        }
    }

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateCurrentUser(
            @RequestPart(value = "user") String userJson,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestHeader("Authorization") String authHeader) {
        
        ObjectMapper objectMapper = new ObjectMapper();
        Users user;
        try {
            user = objectMapper.readValue(userJson, Users.class);
        } catch (JsonProcessingException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Format JSON invalide pour les données utilisateur"));
        }
        
        if (file != null && !file.isEmpty()) {
            try {
                user.setImageData(file.getBytes());
                user.setImageType(file.getContentType());
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la lecture du fichier"));
            }
        }
        try {
            // Extract token from Authorization header
            String token = authHeader.substring(7); // Remove 'Bearer ' prefix
            // Get user ID from token
            Long userId = jwtUtil.extractUserId(token);
            
            // Find the existing user
            Users existingUser = usersService.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
                
            // Update only allowed fields
            if (user.getNom() != null) existingUser.setNom(user.getNom());
            if (user.getPrenom() != null) existingUser.setPrenom(user.getPrenom());
            if (user.getEmail() != null) existingUser.setEmail(user.getEmail());
            if (user.getTel() != null) existingUser.setTel(user.getTel());
            
            // Gérer l'image (BLOB)
            if (user.getImageData() != null) {
                existingUser.setImageData(user.getImageData());
                existingUser.setImageType(user.getImageType());
            }
            
            if (user.getStatusCompte() != null) existingUser.setStatusCompte(user.getStatusCompte());
            
            // Save the updated user
            Users updatedUser = usersService.save(existingUser);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la mise à jour du profil", "message", e.getMessage()));
        }
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public Users update(@PathVariable Long id, @RequestBody Users user) {
        Users existing = usersService.findById(id).orElseThrow();

        // Met à jour uniquement les champs non nuls/non vides
        if (user.getNom() != null) existing.setNom(user.getNom());
        if (user.getPrenom() != null) existing.setPrenom(user.getPrenom());
        if (user.getEmail() != null) existing.setEmail(user.getEmail());
        if (user.getTel() != null) existing.setTel(user.getTel());
        if (user.getIdentifiant() != null) existing.setIdentifiant(user.getIdentifiant());
        if (user.getCin() != null) existing.setCin(user.getCin());
        if (user.getMatiere() != null) existing.setMatiere(user.getMatiere());
        if (user.getImageUrl() != null) existing.setImageUrl(user.getImageUrl());
        if (user.getStatusCompte() != null) existing.setStatusCompte(user.getStatusCompte());

        // Mot de passe : ne le change que s'il est fourni et non vide
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            existing.setPassword(user.getPassword());
        }

        // Ne touche pas au rôle (il reste inchangé)

        return usersService.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        try {
            // Vérifier si l'utilisateur existe avant de le supprimer
            if (!usersService.findById(id).isPresent()) {
                throw new RuntimeException("User with ID " + id + " not found");
            }
            
            usersService.deleteById(id);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            if (e.getMessage().contains("fk_rattrapage_enseignant")) {
                throw new RuntimeException("Impossible de supprimer cet enseignant car il a des rattrapages associés. Supprimez d'abord ses rattrapages.");
            } else if (e.getMessage().contains("constraint")) {
                throw new RuntimeException("Impossible de supprimer cet utilisateur car il est référencé dans d'autres tables.");
            } else {
                throw new RuntimeException("Erreur lors de la suppression: " + e.getMessage());
            }
        }
    }

    @GetMapping("/{id}/disponibilite")
    public Map<String, Object> getDisponibilite(@PathVariable Long id) {
        Users user = usersService.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Map<String, Object> disponibilite = user.getDisponibilite();
        
        // Si pas de disponibilité définie, retourner une structure vide
        if (disponibilite == null) {
            return Map.of(
                "lundi", List.of(),
                "mardi", List.of(),
                "mercredi", List.of(),
                "jeudi", List.of(),
                "vendredi", List.of(),
                "samedi", List.of()
            );
        }
        
        return disponibilite;
    }

    @PutMapping("/{id}/disponibilite")
    public Users updateDisponibilite(@PathVariable Long id, @RequestBody Map<String, Object> disponibilite) {
        Users existing = usersService.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        existing.setDisponibilite(disponibilite);
        return usersService.save(existing);
    }

    @GetMapping("/etudiants/classe/{classeId}")
    public List<Users> getEtudiantsByClasse(@PathVariable Integer classeId) {
        return usersService.getEtudiantsByClasse(classeId);
    }

    @GetMapping("/enseignants")
    public List<Map<String, Object>> getEnseignants() {
        // Essayer différentes variantes du rôle enseignant
        List<Users> enseignants = usersService.findByRole("enseignant");
        if (enseignants.isEmpty()) {
            System.out.println("DEBUG: Aucun enseignant trouvé avec 'enseignant', essai avec 'Enseignant'");
            enseignants = usersService.findByRole("Enseignant");
        }
        if (enseignants.isEmpty()) {
            System.out.println("DEBUG: Aucun enseignant trouvé avec 'Enseignant', essai avec 'ENSEIGNANT'");
            enseignants = usersService.findByRole("ENSEIGNANT");
        }
        
        System.out.println("DEBUG: Récupération de " + enseignants.size() + " enseignants");
        
        // Convertir en Map pour inclure imageUrl
        List<Map<String, Object>> result = new ArrayList<>();
        for (Users enseignant : enseignants) {
            Map<String, Object> enseignantMap = new HashMap<>();
            enseignantMap.put("idUser", enseignant.getIdUser());
            enseignantMap.put("nom", enseignant.getNom());
            enseignantMap.put("prenom", enseignant.getPrenom());
            enseignantMap.put("email", enseignant.getEmail());
            enseignantMap.put("tel", enseignant.getTel());
            enseignantMap.put("identifiant", enseignant.getIdentifiant());
            enseignantMap.put("cin", enseignant.getCin());
            enseignantMap.put("matiere", enseignant.getMatiere());
            enseignantMap.put("role", enseignant.getRole() != null ? enseignant.getRole().getTypeRole() : null);
            enseignantMap.put("statusCompte", enseignant.getStatusCompte());
            enseignantMap.put("imageUrl", enseignant.getImageUrl()); // Inclure l'imageUrl calculée
            
            System.out.println("DEBUG: Enseignant - ID: " + enseignant.getIdUser() + 
                             ", Nom: " + enseignant.getNom() + 
                             ", Prénom: " + enseignant.getPrenom() + 
                             ", Matière: " + enseignant.getMatiere() +
                             ", Rôle: " + (enseignant.getRole() != null ? enseignant.getRole().getTypeRole() : "null") +
                             ", ImageUrl: " + enseignant.getImageUrl());
            
            result.add(enseignantMap);
        }
        return result;
    }

    @GetMapping("/etudiants")
    public List<Users> getEtudiants() {
        // Essayer différentes variantes du rôle étudiant
        List<Users> etudiants = usersService.findByRole("etudiant");
        if (etudiants.isEmpty()) {
            System.out.println("DEBUG: Aucun étudiant trouvé avec 'etudiant', essai avec 'Etudiant'");
            etudiants = usersService.findByRole("Etudiant");
        }
        if (etudiants.isEmpty()) {
            System.out.println("DEBUG: Aucun étudiant trouvé avec 'Etudiant', essai avec 'ETUDIANT'");
            etudiants = usersService.findByRole("ETUDIANT");
        }
        
        System.out.println("DEBUG: Récupération de " + etudiants.size() + " étudiants");
        return etudiants;
    }

    @PutMapping("/{id}/status")
    public Users updateAccountStatus(@PathVariable Long id, @RequestBody Map<String, String> statusUpdate) {
        Users existing = usersService.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        String newStatus = statusUpdate.get("statusCompte");
        if (newStatus != null && (newStatus.equals("ACTIF") || newStatus.equals("INACTIF") || newStatus.equals("SUSPENDU"))) {
            existing.setStatusCompte(newStatus);
            System.out.println("DEBUG: Mise à jour du statut du compte " + id + " vers " + newStatus);
            return usersService.save(existing);
        } else {
            throw new RuntimeException("Statut invalide. Utilisez: ACTIF, INACTIF, ou SUSPENDU");
        }
    }

}
