package com.sys_res.esp.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.reactive.function.client.WebClient;
import jakarta.servlet.http.HttpServletRequest;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sys_res.esp.dto.PlanningDto;
import com.sys_res.esp.entity.Classe;
import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.entity.Soutenance;
import com.sys_res.esp.entity.Salle;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.ClasseRepository;
import com.sys_res.esp.repository.PlanningRepository;
import com.sys_res.esp.repository.SalleRepository;
import com.sys_res.esp.repository.UsersRepository;
import com.sys_res.esp.repository.SoutenanceRepository;
import com.sys_res.esp.service.PlanningService;
import com.sys_res.esp.service.EmailService;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/plannings")
public class PlanningController {

    @Autowired
    private WebClient webClient;

    @Autowired
    private SalleRepository salleRepository;

    @Autowired
    private ClasseRepository classeRepository;

    @Autowired
    private PlanningService planningService;

    @Autowired
    private EmailService emailService;
    
    @Autowired
    private PlanningRepository planningRepository;

    @Autowired
    private UsersRepository usersRepository;
    
    @Autowired
    private SoutenanceRepository soutenanceRepository;

    @GetMapping
    public List<Planning> getAllPlannings() {
        return planningRepository.findAll();
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_ENSEIGNANT')")
    public ResponseEntity<String> getPlanningStatus() {
        try {
            boolean hasValidated = planningRepository.hasValidatedPlannings();
            return ResponseEntity.ok(hasValidated ? "valide" : "en_cours");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("en_cours");
        }
    }

    @GetMapping("/enseignant")
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getPlanningsByEnseignant() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            System.out.println("DEBUG: Recherche des plannings pour l'enseignant: " + username);
            
            Users currentUser = usersRepository.findByIdentifiant(username)
                                               .orElseThrow(() -> new RuntimeException("User not found with identifiant: " + username));
            
            System.out.println("DEBUG: User trouvé - ID: " + currentUser.getIdUser() + ", Nom: " + currentUser.getNom());
            
            // Récupérer les plannings normaux
            List<Planning> plannings = planningRepository.findByUserId(currentUser.getIdUser());
            System.out.println("DEBUG: Nombre de plannings trouvés: " + plannings.size());
            
            // Séparer les cours normaux et les rattrapages
            // Désormais, on ne distingue plus les rattrapages: retourner tous les plannings dans "cours"
            List<Planning> coursNormaux = new ArrayList<>(plannings);
            List<Planning> rattrapages = new ArrayList<>();
            System.out.println("DEBUG: Total plannings (cours unifiés): " + coursNormaux.size());

            // Créer la réponse en conservant la forme JSON attendue par le frontend
            Map<String, Object> response = new HashMap<>();
            response.put("cours", coursNormaux);
            response.put("rattrapages", rattrapages); // liste vide pour compatibilité
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("ERROR: Erreur lors de la récupération des plannings: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // Endpoint pour récupérer les séances (plannings + soutenances) d'un enseignant
    @GetMapping("/seances/enseignant")
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getSeancesEnseignant() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            
            Users currentUser = usersRepository.findByIdentifiant(username)
                                               .orElseThrow(() -> new RuntimeException("User not found with identifiant: " + username));
            
            // Récupérer les plannings de l'enseignant
            List<Planning> plannings = planningRepository.findByUserId(currentUser.getIdUser());
            
            // Convertir en format unifié pour le frontend
            List<Map<String, Object>> seances = new ArrayList<>();
            
            for (Planning planning : plannings) {
                Map<String, Object> seance = new HashMap<>();
                seance.put("id", planning.getIdPlanning());
                seance.put("type", "cours");
                seance.put("date", planning.getDateDebut().toString());
                seance.put("heureDebut", planning.getHeureDebut().toString());
                seance.put("heureFin", planning.getHeureFin().toString());
                seance.put("classe", planning.getClasse() != null ? planning.getClasse().getNomClasse() : "");
                seance.put("matiere", "Cours");
                seance.put("salle", planning.getSalle() != null ? planning.getSalle().getNumSalle() : "");
                seance.put("mode", "Présentiel");
                seances.add(seance);
            }
            
            return ResponseEntity.ok(seances);
        } catch (Exception e) {
            System.err.println("ERROR: Erreur lors de la récupération des séances: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/generate")
    public Mono<ResponseEntity<String>> generatePlanning(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName(); // This is the 'identifiant' from the JWT token
        Users currentUser = usersRepository.findByIdentifiant(username)
                                           .orElseThrow(() -> new RuntimeException("User not found with identifiant: " + username));

        // 1. Fetch data from your database
        List<Salle> salles = salleRepository.findAll();
        List<Classe> classes = classeRepository.findAll();

        // 2. Construct the request body for the Python AI service
        // The Python service expects a JSON object with 'salles' and 'classes' arrays
        ObjectMapper mapper = new ObjectMapper();
        com.fasterxml.jackson.databind.node.ObjectNode requestBodyJson = mapper.createObjectNode();
        try {
            requestBodyJson.set("salles", mapper.valueToTree(salles));
            requestBodyJson.set("classes", mapper.valueToTree(classes));
        } catch (IllegalArgumentException e) {
            return Mono.just(ResponseEntity.status(500).body("Error creating request body for Python AI: " + e.getMessage()));
        }
        
        // 3. Call the Python AI service
        // Récupérer le token JWT de la requête actuelle
        String authHeader = request.getHeader("Authorization");
        
        return webClient.post()
                .uri("http://localhost:5001/generate-planning") // Python AI service URL
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", authHeader) // Ajouter le token JWT
                .bodyValue(requestBodyJson.toString())
                .retrieve()
                .bodyToMono(JsonNode.class)
                .flatMap(response -> {
                    try {
                        // 4. Parse the response and save to database
                        savePlanningFromPythonResponse(response, currentUser);
                        return Mono.just(ResponseEntity.ok("Planning generated and saved successfully."));
                    } catch (JsonProcessingException e) {
                        return Mono.just(ResponseEntity.status(500).body("Error parsing Python AI response: " + e.getMessage()));
                    }
                })
                .onErrorResume(e -> Mono.just(ResponseEntity.status(500).body("Error calling Python AI service: " + e.getMessage())));
    }

    // Removed buildPrompt as it's no longer needed for Gemini
    // private String buildPrompt(List<Salle> salles, List<Classe> classes) { ... }

    private void savePlanningFromPythonResponse(JsonNode response, Users currentUser) throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();
        // The Python service directly returns a JSON array of planning objects
        JsonNode planningArray = response; 

        if (planningArray.isArray()) {
            for (JsonNode planningNode : planningArray) {
                Planning planning = new Planning();
                planning.setSalle(salleRepository.findById(planningNode.get("id_salle").asLong()).orElse(null));
                planning.setClasse(classeRepository.findById(planningNode.get("id_classe").asInt()).orElse(null));
                
                // Parse jour, heure_debut, heure_fin from Python response
                String jour = planningNode.get("jour").asText();
                String heureDebutStr = planningNode.get("heure_debut").asText();
                String heureFinStr = planningNode.get("heure_fin").asText();

                // Assuming a fixed date for now, as the Python model doesn't provide it
                LocalDate fixedDate = LocalDate.of(2024, 9, 10); // Example fixed date
                
                // Convert String times to LocalTime
                DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("H:mm");
                LocalTime heureDebut = LocalTime.parse(heureDebutStr, timeFormatter);
                LocalTime heureFin = LocalTime.parse(heureFinStr, timeFormatter);

                // Set date and time for planning
                planning.setDateDebut(java.sql.Date.valueOf(fixedDate));
                planning.setDateFin(java.sql.Date.valueOf(fixedDate)); // Assuming same day for start and end
                planning.setHeureDebut(java.sql.Time.valueOf(heureDebut));
                planning.setHeureFin(java.sql.Time.valueOf(heureFin));

                planning.setTypePlanning("cour");
                planning.setStatutValidation("en_cours"); // Statut par défaut
                planning.setUser(currentUser); // Set the current authenticated user
                planningService.save(planning);
            }
        }
    }
    
    @PostMapping
    public Planning createPlanning(@RequestBody PlanningDto dto) {
        Planning planning = new Planning();
        
        // Convertir les dates string en Date SQL
        LocalDate dateDebut = LocalDate.parse(dto.getDateDebut());
        LocalDate dateFin = LocalDate.parse(dto.getDateFin());
        planning.setDateDebut(java.sql.Date.valueOf(dateDebut));
        planning.setDateFin(java.sql.Date.valueOf(dateFin));
        
        // Convertir les heures string en Time SQL si présentes
        if (dto.getHeureDebut() != null && dto.getHeureFin() != null) {
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("H:mm");
            LocalTime heureDebut = LocalTime.parse(dto.getHeureDebut(), timeFormatter);
            LocalTime heureFin = LocalTime.parse(dto.getHeureFin(), timeFormatter);
            planning.setHeureDebut(java.sql.Time.valueOf(heureDebut));
            planning.setHeureFin(java.sql.Time.valueOf(heureFin));
        }
        
        planning.setTypePlanning(dto.getTypePlanning());
        planning.setModeCours(dto.getModeCours() != null ? dto.getModeCours() : "presentiel");
        planning.setStatutValidation("en_cours"); // Statut par défaut
        
        // Liaison classe
        Classe classe = classeRepository.findById(dto.getIdClasse()).orElseThrow();
        planning.setClasse(classe);
        // Liaison salle
        Salle salle = salleRepository.findById(dto.getIdSalle()).orElseThrow();
        planning.setSalle(salle);
        // Liaison user
        Users user = usersRepository.findById(dto.getIdUser()).orElseThrow();
        planning.setUser(user);
        return planningRepository.save(planning);
    }

    @PostMapping("/sync-to-microsoft")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ETUDIANT')")
    public ResponseEntity<String> syncToMicrosoft() {
        try {
            System.out.println("DEBUG: Début synchronisation manuelle Microsoft Calendar");
            
            // Récupérer l'utilisateur connecté
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            Users currentUser = usersRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            // Synchroniser les plannings de l'utilisateur
            List<Planning> userPlannings = planningRepository.findByUserId(currentUser.getIdUser());
            if (!userPlannings.isEmpty()) {
                emailService.syncCoursesToMicrosoftCalendar(currentUser, userPlannings);
            }
            
            // Si c'est un étudiant, synchroniser aussi ses soutenances
            if ("Etudiant".equals(currentUser.getRole().getTypeRole())) {
                List<Soutenance> userSoutenances = soutenanceRepository.findByEtudiantId(currentUser.getIdUser());
                for (Soutenance soutenance : userSoutenances) {
                    emailService.syncStudentSoutenanceToMicrosoftCalendar(currentUser, soutenance);
                }
            }
            
            System.out.println("DEBUG: Synchronisation Microsoft Calendar terminée avec succès");
            return ResponseEntity.ok("Synchronisation Microsoft Calendar réussie. Vos événements sont maintenant visibles dans votre calendrier Microsoft.");
            
        } catch (Exception e) {
            System.err.println("ERREUR: Échec de la synchronisation Microsoft Calendar: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur lors de la synchronisation: " + e.getMessage());
        }
    }

    @PostMapping("/save-bulk")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_ENSEIGNANT')")
    public ResponseEntity<String> saveBulkPlanning(@RequestBody List<PlanningDto> planningList) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            System.out.println("DEBUG: Authentication object: " + authentication);
            System.out.println("DEBUG: Authentication authorities: " + authentication.getAuthorities());
            System.out.println("DEBUG: Authentication principal: " + authentication.getPrincipal());
            
            String username = authentication.getName();
            System.out.println("DEBUG: Username from authentication: " + username);
            
            Users currentUser = usersRepository.findByIdentifiant(username)
                                               .orElseThrow(() -> new RuntimeException("User not found with identifiant: " + username));

            // Supprimer les anciens plannings de la même semaine avant de sauvegarder les nouveaux
            if (!planningList.isEmpty()) {
                // Trouver la date la plus ancienne et la plus récente dans la liste
                LocalDate dateMin = planningList.stream()
                    .map(dto -> LocalDate.parse(dto.getDateDebut()))
                    .min(LocalDate::compareTo)
                    .orElse(LocalDate.now());
                
                LocalDate dateMax = planningList.stream()
                    .map(dto -> LocalDate.parse(dto.getDateFin()))
                    .max(LocalDate::compareTo)
                    .orElse(LocalDate.now());
                
                // Supprimer tous les plannings existants pour cette période étendue
                List<Planning> existingPlannings = planningRepository.findByDateDebutBetween(
                    java.sql.Date.valueOf(dateMin), 
                    java.sql.Date.valueOf(dateMax)
                );
                
                if (!existingPlannings.isEmpty()) {
                    System.out.println("DEBUG: Suppression de " + existingPlannings.size() + " anciens plannings pour la période du " + dateMin + " au " + dateMax);
                    planningRepository.deleteAll(existingPlannings);
                }
            }

            for (PlanningDto dto : planningList) {
                Planning planning = new Planning();
                
                // Convertir les dates string en Date SQL
                LocalDate dateDebut = LocalDate.parse(dto.getDateDebut());
                LocalDate dateFin = LocalDate.parse(dto.getDateFin());
                planning.setDateDebut(java.sql.Date.valueOf(dateDebut));
                planning.setDateFin(java.sql.Date.valueOf(dateFin));
                
                // Convertir les heures string en Time SQL
                DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("H:mm");
                LocalTime heureDebut = LocalTime.parse(dto.getHeureDebut(), timeFormatter);
                LocalTime heureFin = LocalTime.parse(dto.getHeureFin(), timeFormatter);
                planning.setHeureDebut(java.sql.Time.valueOf(heureDebut));
                planning.setHeureFin(java.sql.Time.valueOf(heureFin));
                
                planning.setTypePlanning(dto.getTypePlanning());
                planning.setModeCours(dto.getModeCours() != null ? dto.getModeCours() : "presentiel");
                planning.setStatutValidation("valide"); // Marquer comme validé lors de la sauvegarde bulk
                
                // Liaison classe
                Classe classe = classeRepository.findById(dto.getIdClasse()).orElseThrow();
                planning.setClasse(classe);
                
                // Liaison salle
                Salle salle = salleRepository.findById(dto.getIdSalle()).orElseThrow();
                planning.setSalle(salle);
                
                // Associer l'enseignant spécifié dans le DTO
                if (dto.getIdUser() != null) {
                    Users enseignant = usersRepository.findById(dto.getIdUser()).orElseThrow(
                        () -> new RuntimeException("Enseignant not found with ID: " + dto.getIdUser())
                    );
                    planning.setUser(enseignant);
                } else {
                    // Fallback: utiliser l'utilisateur connecté si pas d'enseignant spécifié
                    planning.setUser(currentUser);
                }
                
                planningRepository.save(planning);
            }
            
            // Envoyer l'email de notification à tous les enseignants après validation réussie
            // ET synchroniser automatiquement avec Microsoft Calendar
            try {
                emailService.sendPlanningNotificationToAllTeachers();
                System.out.println("DEBUG: Emails et synchronisation Microsoft Calendar terminés pour tous les enseignants");
            } catch (Exception emailException) {
                // Log l'erreur mais ne pas faire échouer la sauvegarde
                System.err.println("Erreur lors de l'envoi des emails ou synchronisation Calendar: " + emailException.getMessage());
            }
            
            // Envoyer l'emploi du temps aux étudiants des classes concernées
            try {
                List<Planning> savedPlannings = planningRepository.findByStatutValidation("valide");
                emailService.sendClassScheduleToStudents(savedPlannings);
            } catch (Exception emailException) {
                System.err.println("Erreur lors de l'envoi des emails aux étudiants: " + emailException.getMessage());
            }
            
            return ResponseEntity.ok("Planning sauvegardé avec succès en base de données (ancien planning supprimé)");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors de la sauvegarde: " + e.getMessage());
        }
    }
    
    // Endpoint de test pour diagnostiquer l'envoi d'emails
    @PostMapping("/test-email")
    public ResponseEntity<String> testEmailSending() {
        try {
            System.out.println("=== TEST ENVOI EMAIL PLANNING ===");
            
            // Récupérer tous les plannings validés
            List<Planning> validPlannings = planningRepository.findByStatutValidation("valide");
            System.out.println("Plannings validés trouvés: " + validPlannings.size());
            
            if (validPlannings.isEmpty()) {
                return ResponseEntity.ok("Aucun planning validé trouvé. Veuillez d'abord valider des plannings.");
            }
            
            // Tester l'envoi d'emails aux étudiants
            emailService.sendClassScheduleToStudents(validPlannings);
            
            return ResponseEntity.ok("Test d'envoi d'emails terminé. Vérifiez les logs de la console.");
            
        } catch (Exception e) {
            System.err.println("Erreur lors du test d'envoi d'emails: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Erreur lors du test: " + e.getMessage());
        }
    }
}
