package com.sys_res.esp.controller;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

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
import com.sys_res.esp.entity.Salle;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.ClasseRepository;
import com.sys_res.esp.repository.PlanningRepository;
import com.sys_res.esp.repository.SalleRepository;
import com.sys_res.esp.repository.UsersRepository;
import com.sys_res.esp.service.PlanningService;

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
    private PlanningRepository planningRepository;

    @Autowired
    private UsersRepository usersRepository;

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
    public ResponseEntity<List<Planning>> getPlanningsByEnseignant() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            System.out.println("DEBUG: Recherche des plannings pour l'enseignant: " + username);
            
            Users currentUser = usersRepository.findByIdentifiant(username)
                                               .orElseThrow(() -> new RuntimeException("User not found with identifiant: " + username));
            
            System.out.println("DEBUG: Utilisateur trouvé - ID: " + currentUser.getIdUser() + ", Nom: " + currentUser.getNom());
            
            List<Planning> plannings = planningRepository.findByUserId(currentUser.getIdUser());
            System.out.println("DEBUG: Nombre de plannings trouvés: " + plannings.size());
            
            if (!plannings.isEmpty()) {
                System.out.println("DEBUG: Premier planning - Date: " + plannings.get(0).getDateDebut() + 
                                 ", Heure: " + plannings.get(0).getHeureDebut() + 
                                 ", Classe: " + (plannings.get(0).getClasse() != null ? plannings.get(0).getClasse().getNomClasse() : "null"));
            }
            
            return ResponseEntity.ok(plannings);
        } catch (Exception e) {
            System.err.println("ERROR: Erreur lors de la récupération des plannings: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
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
            
            return ResponseEntity.ok("Planning sauvegardé avec succès en base de données (ancien planning supprimé)");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur lors de la sauvegarde: " + e.getMessage());
        }
    }
}
