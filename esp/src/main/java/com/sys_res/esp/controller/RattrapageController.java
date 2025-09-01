package com.sys_res.esp.controller;

import com.sys_res.esp.entity.Rattrapage;
import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.entity.Soutenance;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.entity.Salle;
import com.sys_res.esp.entity.Classe;
import com.sys_res.esp.repository.RattrapageRepository;
import com.sys_res.esp.repository.PlanningRepository;
import com.sys_res.esp.repository.SoutenanceRepository;
import com.sys_res.esp.repository.UsersRepository;
import com.sys_res.esp.repository.SalleRepository;
import com.sys_res.esp.repository.ClasseRepository;
import com.sys_res.esp.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.util.stream.Collectors;
import java.sql.Date;
import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/rattrapages")
@CrossOrigin(origins = "http://localhost:3000")
public class RattrapageController {

    @Autowired
    private RattrapageRepository rattrapageRepository;

    @Autowired
    private PlanningRepository planningRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private SalleRepository salleRepository;

    @Autowired
    private ClasseRepository classeRepository;

    @Autowired
    private SoutenanceRepository soutenanceRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private com.sys_res.esp.service.EmailService emailService;

    // Récupérer toutes les demandes d'un enseignant
    @GetMapping("/enseignant")
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getDemandesEnseignant(HttpServletRequest request) {
        try {
            System.out.println("DEBUG: Début getDemandesEnseignant");
            
            String token = extractTokenFromRequest(request);
            if (token == null) {
                System.out.println("DEBUG: Token manquant dans getDemandesEnseignant");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token manquant"));
            }

            System.out.println("DEBUG: Token extrait pour enseignant: " + token.substring(0, Math.min(20, token.length())) + "...");
            
            Long idEnseignant = jwtUtil.extractUserId(token);
            System.out.println("DEBUG: ID enseignant extrait: " + idEnseignant);
            
            if (idEnseignant == null) {
                System.out.println("DEBUG: ID enseignant est null - token invalide ou ancien");
                System.out.println("DEBUG: Token claims: " + jwtUtil.getAllClaimsFromToken(token));
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token invalide - veuillez vous reconnecter pour obtenir un nouveau token avec userId"));
            }
            
            List<Rattrapage> demandes = rattrapageRepository.findByIdEnseignantOrderByDateCreationDesc(idEnseignant);
            System.out.println("DEBUG: Nombre de demandes trouvées pour enseignant " + idEnseignant + ": " + demandes.size());
            
            return ResponseEntity.ok(demandes);
        } catch (Exception e) {
            System.err.println("ERROR: Exception dans getDemandesEnseignant: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la récupération des demandes: " + e.getMessage()));
        }
    }

    /**
     * Récupérer les rattrapages approuvés d'un enseignant sous un format compatible planning
     */
    @GetMapping("/planning/enseignant")
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getRattrapagesPlanningEnseignant(HttpServletRequest request) {
        try {
            String token = extractTokenFromRequest(request);
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token manquant"));
            }

            Long idEnseignant = jwtUtil.extractUserId(token);
            if (idEnseignant == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token invalide - veuillez vous reconnecter"));
            }

            // Récupérer uniquement les rattrapages approuvés
            List<Rattrapage> rattrapages = rattrapageRepository
                .findByIdEnseignantAndStatutOrderByDateCreationDesc(idEnseignant, "approuve");

            // Mapper vers un format simple attendu par le frontend planning
            List<Map<String, Object>> items = rattrapages.stream().map(r -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", r.getIdRattrapage());
                m.put("date_planning", r.getDateRattrapageProposee() != null ? r.getDateRattrapageProposee().toString() : null);
                m.put("heure_debut", r.getHeureDebutRattrapage() != null ? r.getHeureDebutRattrapage().toString() : null);
                m.put("heure_fin", r.getHeureFinRattrapage() != null ? r.getHeureFinRattrapage().toString() : null);
                m.put("matiere", r.getMatiere());
                m.put("nom_classe", r.getClasse());
                m.put("salle", r.getSallePreferee());
                return m;
            }).collect(java.util.stream.Collectors.toList());

            return ResponseEntity.ok(items);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la récupération des rattrapages: " + e.getMessage()));
        }
    }

    // Récupérer toutes les demandes (endpoint général)
    @GetMapping
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getAllDemandes(HttpServletRequest request) {
        try {
            System.out.println("DEBUG: Début getAllDemandes");
            
            String token = extractTokenFromRequest(request);
            if (token == null) {
                System.out.println("DEBUG: Token manquant");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token manquant"));
            }

            System.out.println("DEBUG: Token extrait: " + token.substring(0, Math.min(20, token.length())) + "...");
            
            String userRole = jwtUtil.extractRole(token);
            System.out.println("DEBUG: Rôle utilisateur: " + userRole);
            
            if ("ROLE_ADMIN".equals(userRole)) {
                System.out.println("DEBUG: Récupération demandes admin");
                List<Rattrapage> demandes = rattrapageRepository.findAllOrderByDateCreationDesc();
                System.out.println("DEBUG: Nombre de demandes trouvées (admin): " + demandes.size());
                return ResponseEntity.ok(demandes);
            } else {
                Long idEnseignant = jwtUtil.extractUserId(token);
                System.out.println("DEBUG: ID enseignant: " + idEnseignant);
                System.out.println("DEBUG: Récupération demandes enseignant");
                List<Rattrapage> demandes = rattrapageRepository.findByIdEnseignantOrderByDateCreationDesc(idEnseignant);
                System.out.println("DEBUG: Nombre de demandes trouvées (enseignant): " + demandes.size());
                return ResponseEntity.ok(demandes);
            }
        } catch (Exception e) {
            System.err.println("ERROR: Exception dans getAllDemandes: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la récupération des demandes: " + e.getMessage()));
        }
    }

    // Créer une nouvelle demande de rattrapage
    @PostMapping
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> creerDemande(@RequestBody Map<String, Object> demandeData, HttpServletRequest request) {
        try {
            System.out.println("DEBUG: Début creerDemande");
            System.out.println("DEBUG: Données reçues: " + demandeData);
            
            String token = extractTokenFromRequest(request);
            if (token == null) {
                System.out.println("DEBUG: Token manquant dans creerDemande");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token manquant"));
            }

            Long idEnseignant = jwtUtil.extractUserId(token);
            System.out.println("DEBUG: ID enseignant pour création: " + idEnseignant);
            
            // Créer la nouvelle demande
            Rattrapage rattrapage = new Rattrapage();
            rattrapage.setIdEnseignant(idEnseignant);
            
            // Données de la séance manquée
            if (demandeData.get("idSeance") != null) {
                rattrapage.setIdSeance(Long.valueOf(demandeData.get("idSeance").toString()));
            }
            
            rattrapage.setDateAbsence(LocalDate.parse(demandeData.get("dateAbsence").toString()));
            rattrapage.setHeureDebutAbsence(LocalTime.parse(demandeData.get("heureDebutAbsence").toString()));
            rattrapage.setHeureFinAbsence(LocalTime.parse(demandeData.get("heureFinAbsence").toString()));
            rattrapage.setClasse(demandeData.get("classe").toString());
            rattrapage.setMatiere(demandeData.get("matiere").toString());
            rattrapage.setMotif(demandeData.get("motif").toString());
            
            // Données du rattrapage proposé
            rattrapage.setDateRattrapageProposee(LocalDate.parse(demandeData.get("dateRattrapage").toString()));
            rattrapage.setHeureDebutRattrapage(LocalTime.parse(demandeData.get("heureDebutRattrapage").toString()));
            rattrapage.setHeureFinRattrapage(LocalTime.parse(demandeData.get("heureFinRattrapage").toString()));
            
            if (demandeData.get("sallePreferee") != null && !demandeData.get("sallePreferee").toString().isEmpty()) {
                rattrapage.setSallePreferee(demandeData.get("sallePreferee").toString());
            }
            
            if (demandeData.get("commentaire") != null && !demandeData.get("commentaire").toString().isEmpty()) {
                rattrapage.setCommentaire(demandeData.get("commentaire").toString());
            }

            Rattrapage savedRattrapage = rattrapageRepository.save(rattrapage);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(savedRattrapage);
        } catch (Exception e) {
            System.err.println("ERROR: Erreur lors de la création de la demande: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la création de la demande: " + e.getMessage()));
        }
    }

    // Récupérer toutes les demandes (pour admin)
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getToutesLesDemandes() {
        try {
            List<Rattrapage> demandes = rattrapageRepository.findAllOrderByDateCreationDesc();
            
            // Enrichir chaque demande avec les informations de l'enseignant
            List<Map<String, Object>> demandesEnrichies = demandes.stream().map(demande -> {
                Map<String, Object> demandeMap = new HashMap<>();
                
                // Copier toutes les propriétés de base
                demandeMap.put("idRattrapage", demande.getIdRattrapage());
                demandeMap.put("idEnseignant", demande.getIdEnseignant());
                demandeMap.put("dateAbsence", demande.getDateAbsence());
                demandeMap.put("heureDebutAbsence", demande.getHeureDebutAbsence());
                demandeMap.put("heureFinAbsence", demande.getHeureFinAbsence());
                demandeMap.put("classe", demande.getClasse());
                demandeMap.put("matiere", demande.getMatiere());
                demandeMap.put("motif", demande.getMotif());
                demandeMap.put("dateRattrapageProposee", demande.getDateRattrapageProposee());
                demandeMap.put("heureDebutRattrapage", demande.getHeureDebutRattrapage());
                demandeMap.put("heureFinRattrapage", demande.getHeureFinRattrapage());
                demandeMap.put("sallePreferee", demande.getSallePreferee());
                demandeMap.put("commentaire", demande.getCommentaire());
                demandeMap.put("statut", demande.getStatut());
                demandeMap.put("dateCreation", demande.getDateCreation());
                demandeMap.put("dateModification", demande.getDateModification());
                demandeMap.put("messageAdmin", demande.getMessageAdmin());
                
                // Récupérer les informations de l'enseignant
                try {
                    Optional<Users> enseignantOpt = usersRepository.findById(demande.getIdEnseignant());
                    if (enseignantOpt.isPresent()) {
                        Users enseignant = enseignantOpt.get();
                        demandeMap.put("nomEnseignant", enseignant.getNom());
                        demandeMap.put("prenomEnseignant", enseignant.getPrenom());
                        demandeMap.put("emailEnseignant", enseignant.getEmail());
                    } else {
                        demandeMap.put("nomEnseignant", "Inconnu");
                        demandeMap.put("prenomEnseignant", "Enseignant");
                        demandeMap.put("emailEnseignant", "N/A");
                    }
                } catch (Exception e) {
                    System.err.println("Erreur lors de la récupération de l'enseignant ID " + demande.getIdEnseignant() + ": " + e.getMessage());
                    demandeMap.put("nomEnseignant", "Erreur");
                    demandeMap.put("prenomEnseignant", "Chargement");
                    demandeMap.put("emailEnseignant", "N/A");
                }
                
                return demandeMap;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(demandesEnrichies);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la récupération des demandes: " + e.getMessage()));
        }
    }

    // Mettre à jour le statut d'une demande (pour admin)
    @PutMapping("/{id}/statut")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> mettreAJourStatut(@PathVariable Long id, @RequestBody Map<String, Object> statutData) {
        try {
            Optional<Rattrapage> rattrapageOpt = rattrapageRepository.findById(id);
            if (rattrapageOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Demande non trouvée"));
            }

            Rattrapage rattrapage = rattrapageOpt.get();
            String nouveauStatut = statutData.get("statut").toString();
            
            if (!List.of("en_attente", "approuve", "refuse").contains(nouveauStatut)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Statut invalide"));
            }

            rattrapage.setStatut(nouveauStatut);
            
            // Si la demande est refusée et qu'il y a un message d'alternatives de l'IA
            if ("refuse".equals(nouveauStatut) && statutData.containsKey("messageAdmin")) {
                rattrapage.setMessageAdmin(statutData.get("messageAdmin").toString());
            }
            
            Rattrapage savedRattrapage = rattrapageRepository.save(rattrapage);
            
            // Si la demande est approuvée, supprimer la séance d'origine et créer le rattrapage
            if ("approuve".equals(nouveauStatut)) {
                supprimerSeanceOriginale(rattrapage);
                creerSeancePlanning(rattrapage);
                
                // Envoyer les emails de confirmation
                try {
                    System.out.println("DEBUG: Envoi des emails de confirmation pour le rattrapage approuvé");
                    
                    // Email de confirmation à l'enseignant
                    emailService.sendRattrapageApprovalEmailToTeacher(savedRattrapage);
                    
                    // Email d'information aux étudiants de la classe
                    emailService.sendRattrapageNotificationToStudents(savedRattrapage);
                    
                    System.out.println("DEBUG: Emails de confirmation envoyés avec succès");
                } catch (Exception emailException) {
                    System.err.println("ERREUR: Échec de l'envoi des emails de confirmation: " + emailException.getMessage());
                    emailException.printStackTrace();
                    // Ne pas faire échouer l'approbation si l'envoi d'email échoue
                }
            }
            
            return ResponseEntity.ok(savedRattrapage);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la mise à jour du statut: " + e.getMessage()));
        }
    }

    // Supprimer une demande
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> supprimerDemande(@PathVariable Long id, HttpServletRequest request) {
        try {
            String token = extractTokenFromRequest(request);
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token manquant"));
            }

            Optional<Rattrapage> rattrapageOpt = rattrapageRepository.findById(id);
            if (rattrapageOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Demande non trouvée"));
            }

            Rattrapage rattrapage = rattrapageOpt.get();
            Long idEnseignant = jwtUtil.extractUserId(token);
            String userRole = jwtUtil.extractRole(token);

            // Vérifier que l'enseignant peut supprimer sa propre demande ou que c'est un admin
            if (!userRole.equals("ROLE_ADMIN") && !rattrapage.getIdEnseignant().equals(idEnseignant)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Vous ne pouvez supprimer que vos propres demandes"));
            }

            rattrapageRepository.delete(rattrapage);
            
            return ResponseEntity.ok(Map.of("message", "Demande supprimée avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la suppression: " + e.getMessage()));
        }
    }

    // Statistiques des demandes pour un enseignant
    @GetMapping("/statistiques")
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getStatistiques(HttpServletRequest request) {
        try {
            String token = extractTokenFromRequest(request);
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token manquant"));
            }

            Long idEnseignant = jwtUtil.extractUserId(token);
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("total", rattrapageRepository.findByIdEnseignantOrderByDateCreationDesc(idEnseignant).size());
            stats.put("en_attente", rattrapageRepository.countByEnseignantAndStatut(idEnseignant, "en_attente"));
            stats.put("approuve", rattrapageRepository.countByEnseignantAndStatut(idEnseignant, "approuve"));
            stats.put("refuse", rattrapageRepository.countByEnseignantAndStatut(idEnseignant, "refuse"));
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la récupération des statistiques: " + e.getMessage()));
        }
    }

    // Récupérer une demande spécifique
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getDemande(@PathVariable Long id, HttpServletRequest request) {
        try {
            String token = extractTokenFromRequest(request);
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token manquant"));
            }

            Optional<Rattrapage> rattrapageOpt = rattrapageRepository.findById(id);
            if (rattrapageOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Demande non trouvée"));
            }

            Rattrapage rattrapage = rattrapageOpt.get();
            Long idEnseignant = jwtUtil.extractUserId(token);
            String userRole = jwtUtil.extractRole(token);

            // Vérifier que l'enseignant peut voir sa propre demande ou que c'est un admin
            if (!userRole.equals("ROLE_ADMIN") && !rattrapage.getIdEnseignant().equals(idEnseignant)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Accès non autorisé"));
            }

            return ResponseEntity.ok(rattrapage);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de la récupération de la demande: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/analyze")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> analyzerDemande(@PathVariable Long id) {
        try {
            Optional<Rattrapage> rattrapageOpt = rattrapageRepository.findById(id);
            if (rattrapageOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Demande non trouvée"));
            }

            Rattrapage rattrapage = rattrapageOpt.get();

            // Préparer les données pour l'IA
            Map<String, Object> aiRequest = new HashMap<>();
            aiRequest.put("classe", rattrapage.getClasse());
            aiRequest.put("matiere", rattrapage.getMatiere());
            aiRequest.put("date_rattrapage", rattrapage.getDateRattrapageProposee().toString());
            aiRequest.put("heure_debut", rattrapage.getHeureDebutRattrapage().toString());
            aiRequest.put("heure_fin", rattrapage.getHeureFinRattrapage().toString());
            aiRequest.put("motif", rattrapage.getMotif());

            // Appel au service IA
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(aiRequest, headers);

            try {
                Map<String, Object> aiResponse = restTemplate.postForObject(
                    "http://localhost:5001/analyze-rattrapage", 
                    entity, 
                    Map.class
                );

                return ResponseEntity.ok(aiResponse);
            } catch (Exception aiException) {
                // Fallback en cas d'erreur du service IA
                Map<String, Object> fallbackResponse = new HashMap<>();
                fallbackResponse.put("status", "warning");
                fallbackResponse.put("message", "Service IA indisponible, analyse manuelle requise");
                fallbackResponse.put("analysis", Map.of(
                    "recommandation", "ANALYSE_MANUELLE",
                    "score_confiance", 50,
                    "raisons", List.of("Service IA temporairement indisponible"),
                    "suggestions", List.of("Procéder à une analyse manuelle")
                ));
                return ResponseEntity.ok(fallbackResponse);
            }

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Erreur lors de l'analyse: " + e.getMessage()));
        }
    }

    /**
     * Créer une séance dans le planning lorsqu'une demande de rattrapage est approuvée
     */
    private void creerSeancePlanning(Rattrapage rattrapage) {
        try {
            // Récupérer l'enseignant
            Optional<Users> enseignantOpt = usersRepository.findById(rattrapage.getIdEnseignant());
            if (enseignantOpt.isEmpty()) {
                System.err.println("Enseignant non trouvé pour ID: " + rattrapage.getIdEnseignant());
                return;
            }

            // Trouver une classe par défaut ou utiliser la classe mentionnée dans la demande
            Optional<Classe> classeOpt = classeRepository.findByNomClasse(rattrapage.getClasse());
            if (classeOpt.isEmpty()) {
                System.err.println("Classe non trouvée: " + rattrapage.getClasse());
                return;
            }

            // Trouver une salle disponible (première salle disponible)
            List<Salle> sallesDisponibles = salleRepository.findAll().stream()
                .filter(salle -> salle.getDisponibilite() != null && salle.getDisponibilite())
                .collect(Collectors.toList());
            
            if (sallesDisponibles.isEmpty()) {
                System.err.println("Aucune salle disponible trouvée");
                return;
            }

            // Créer l'objet Planning
            Planning planning = new Planning();
            planning.setDateDebut(Date.valueOf(rattrapage.getDateRattrapageProposee()));
            planning.setDateFin(Date.valueOf(rattrapage.getDateRattrapageProposee()));
            planning.setHeureDebut(Time.valueOf(rattrapage.getHeureDebutRattrapage()));
            planning.setHeureFin(Time.valueOf(rattrapage.getHeureFinRattrapage()));
            planning.setUser(enseignantOpt.get());
            planning.setClasse(classeOpt.get());
            planning.setSalle(sallesDisponibles.get(0));
            planning.setTypePlanning(determinerTypePlanning(rattrapage));
            planning.setStatutValidation("valide");

            // Sauvegarder dans la base de données
            planningRepository.save(planning);
            
            System.out.println("Séance de rattrapage ajoutée au planning pour l'enseignant ID: " + 
                rattrapage.getIdEnseignant() + " le " + rattrapage.getDateRattrapageProposee());

        } catch (Exception e) {
            System.err.println("Erreur lors de la création de la séance planning: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Supprimer la séance d'origine (cours ou soutenance) lors de l'approbation d'un rattrapage
     */
    private void supprimerSeanceOriginale(Rattrapage rattrapage) {
        try {
            Date dateAbsence = Date.valueOf(rattrapage.getDateAbsence());
            Time heureDebut = Time.valueOf(rattrapage.getHeureDebutAbsence());
            Time heureFin = Time.valueOf(rattrapage.getHeureFinAbsence());
            
            System.out.println("DEBUG: Tentative de suppression séance originale - " +
                             "Date: " + dateAbsence + 
                             ", Heure: " + heureDebut + "-" + heureFin + 
                             ", Enseignant: " + rattrapage.getIdEnseignant() +
                             ", Motif: " + rattrapage.getMotif());
            
            // Déterminer le type de séance à supprimer
            String typePlanning = determinerTypePlanning(rattrapage);
            System.out.println("DEBUG: Type de séance détecté: " + typePlanning);
            
            if ("soutenance".equals(typePlanning)) {
                // 1. Chercher les soutenances correspondantes
                List<Soutenance> soutenancesOriginales = 
                    soutenanceRepository.findOriginalSoutenance(dateAbsence, heureDebut);
                
                System.out.println("DEBUG: Nombre de soutenances trouvées: " + soutenancesOriginales.size());
                
                // 2. Supprimer chaque soutenance trouvée
                if (!soutenancesOriginales.isEmpty()) {
                    for (Soutenance s : soutenancesOriginales) {
                        System.out.println("DEBUG: Suppression soutenance ID: " + s.getIdSoutenance() +
                                         ", Date: " + s.getDate() + 
                                         ", Heure: " + s.getHeureTime() +
                                         ", Statut: " + s.getStatutValidation());
                    }
                    int deleted = soutenanceRepository.deleteOriginalSoutenance(dateAbsence, heureDebut);
                    System.out.println("DEBUG: Nombre de soutenances supprimées: " + deleted);
                } else {
                    System.out.println("AUCUNE soutenance trouvée à supprimer pour " + dateAbsence + " à " + heureDebut);
                }
            } else {
                // 1. Chercher les cours correspondants
                List<Planning> coursOriginaux = 
                    planningRepository.findOriginalSeance(rattrapage.getIdEnseignant(), dateAbsence, heureDebut, heureFin);
                
                System.out.println("DEBUG: Nombre de cours trouvés: " + coursOriginaux.size());
                
                // 2. Supprimer chaque cours trouvé
                if (!coursOriginaux.isEmpty()) {
                    for (Planning p : coursOriginaux) {
                        System.out.println("DEBUG: Suppression cours ID: " + p.getIdPlanning() +
                                         ", Date: " + p.getDateDebut() + 
                                         ", Heure: " + p.getHeureDebut() + "-" + p.getHeureFin() +
                                         ", Statut: " + p.getStatutValidation());
                    }
                    int deleted = planningRepository.deleteOriginalSeance(
                        rattrapage.getIdEnseignant(), dateAbsence, heureDebut, heureFin);
                    System.out.println("DEBUG: Nombre de cours supprimés: " + deleted);
                } else {
                    System.out.println("AUCUN cours trouvé à supprimer pour " + rattrapage.getIdEnseignant() + 
                                     " le " + dateAbsence + " de " + heureDebut + " à " + heureFin);
                }
            }
            
        } catch (Exception e) {
            System.err.println("ERREUR: Impossible de supprimer la séance originale: " + e.getMessage());
            e.printStackTrace();
            // Ne pas bloquer le processus si la suppression échoue
        }
    }

    /**
     * Récupérer les créneaux occupés par l'enseignant (cours et soutenances avec horaires)
     */
    @GetMapping("/dates-occupees")
    @PreAuthorize("hasRole('ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> getDatesOccupees(HttpServletRequest request) {
        try {
            String token = extractTokenFromRequest(request);
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            String identifiant = jwtUtil.getIdentifiantFromToken(token);
            Optional<Users> userOpt = usersRepository.findByIdentifiant(identifiant);
            
            if (!userOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            Long enseignantId = userOpt.get().getIdUser();
            
            // Récupérer tous les cours de l'enseignant
            List<Planning> coursEnseignant = planningRepository.findByUserId(enseignantId);
            
            // Récupérer toutes les soutenances de l'enseignant
            List<Soutenance> soutenancesEnseignant = soutenanceRepository.findAll().stream()
                .filter(s -> s.getUser() != null && s.getUser().getIdUser().equals(enseignantId))
                .collect(Collectors.toList());
            
            // Créer une liste des créneaux occupés avec détails
            List<Map<String, Object>> creneauxOccupes = new ArrayList<>();
            Set<String> datesOccupees = new HashSet<>();
            
            // Ajouter les créneaux des cours
            for (Planning cours : coursEnseignant) {
                if ("valide".equals(cours.getStatutValidation())) {
                    Map<String, Object> creneau = new HashMap<>();
                    creneau.put("date", cours.getDateDebut().toString());
                    creneau.put("heureDebut", cours.getHeureDebut().toString());
                    creneau.put("heureFin", cours.getHeureFin().toString());
                    creneau.put("type", "cours");
                    creneau.put("matiere", cours.getTypePlanning());
                    creneauxOccupes.add(creneau);
                    datesOccupees.add(cours.getDateDebut().toString());
                }
            }
            
            // Ajouter les créneaux des soutenances
            for (Soutenance soutenance : soutenancesEnseignant) {
                if ("valide".equals(soutenance.getStatutValidation())) {
                    Map<String, Object> creneau = new HashMap<>();
                    creneau.put("date", soutenance.getDate().toString());
                    creneau.put("heureDebut", soutenance.getHeureTime().toString());
                    creneau.put("heureFin", calculerHeureFin(soutenance.getHeureTime(), soutenance.getDuree()));
                    creneau.put("type", "soutenance");
                    creneau.put("matiere", "Soutenance");
                    creneauxOccupes.add(creneau);
                    datesOccupees.add(soutenance.getDate().toString());
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("creneauxOccupes", creneauxOccupes);
            response.put("datesOccupees", new ArrayList<>(datesOccupees));
            response.put("message", "Créneaux occupés récupérés avec succès");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur lors de la récupération des créneaux occupés: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Vérifier si une date/heure est disponible pour un rattrapage avec détection des chevauchements
     */
    @PostMapping("/verifier-disponibilite")
    @PreAuthorize("hasRole('ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> verifierDisponibilite(
            @RequestBody Map<String, Object> disponibiliteData, 
            HttpServletRequest request) {
        try {
            String token = extractTokenFromRequest(request);
            if (token == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            String identifiant = jwtUtil.getIdentifiantFromToken(token);
            Optional<Users> userOpt = usersRepository.findByIdentifiant(identifiant);
            
            if (!userOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
            }

            Long enseignantId = userOpt.get().getIdUser();
            
            // Extraire les paramètres de la demande
            String dateRattrapage = (String) disponibiliteData.get("dateRattrapage");
            String heureDebut = (String) disponibiliteData.get("heureDebut");
            String heureFin = (String) disponibiliteData.get("heureFin");
            
            System.out.println("DEBUG: Vérification disponibilité pour enseignant " + enseignantId + 
                             " le " + dateRattrapage + " de " + heureDebut + " à " + heureFin);
            System.out.println("DEBUG: Heures reçues - Début: '" + heureDebut + "', Fin: '" + heureFin + "'");
            
            // Convertir en types SQL
            Date dateRattrapageSQL;
            Time heureDebutSQL;
            Time heureFinSQL;
            
            try {
                dateRattrapageSQL = Date.valueOf(dateRattrapage);
                
                // Gérer le format des heures (avec ou sans secondes)
                String heureDebutFormatted = heureDebut.contains(":") && heureDebut.split(":").length == 3 
                    ? heureDebut : heureDebut + ":00";
                String heureFinFormatted = heureFin.contains(":") && heureFin.split(":").length == 3 
                    ? heureFin : heureFin + ":00";
                    
                heureDebutSQL = Time.valueOf(heureDebutFormatted);
                heureFinSQL = Time.valueOf(heureFinFormatted);
            } catch (Exception parseException) {
                System.err.println("ERROR: Erreur de parsing des dates/heures: " + parseException.getMessage());
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Format de date/heure invalide: " + parseException.getMessage());
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
            }
            
            System.out.println("DEBUG: Date rattrapage reçue: " + dateRattrapage);
            System.out.println("DEBUG: Date rattrapage SQL: " + dateRattrapageSQL);
            System.out.println("DEBUG: Heure début: " + heureDebutSQL);
            System.out.println("DEBUG: Heure fin: " + heureFinSQL);
            
            // Récupérer tous les cours de l'enseignant
            List<Planning> tousLesCours;
            try {
                System.out.println("DEBUG: Récupération des cours pour enseignant ID: " + enseignantId);
                tousLesCours = planningRepository.findByUserId(enseignantId);
                System.out.println("DEBUG: Nombre total de cours trouvés: " + tousLesCours.size());
            } catch (Exception dbException) {
                System.err.println("ERROR: Erreur lors de la récupération des cours: " + dbException.getMessage());
                dbException.printStackTrace();
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Erreur base de données: " + dbException.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
            }
            
            // Filtrer pour cette date
            List<Planning> coursJour = tousLesCours.stream()
                .filter(p -> {
                    boolean dateMatch = p.getDateDebut().equals(dateRattrapageSQL);
                    boolean statutValide = "valide".equals(p.getStatutValidation());
                    System.out.println("DEBUG: Cours ID " + p.getIdPlanning() + 
                                     " - Date: " + p.getDateDebut() + " (match: " + dateMatch + ")" +
                                     " - Statut: " + p.getStatutValidation() + " (valide: " + statutValide + ")" +
                                     " - Heures: " + p.getHeureDebut() + "-" + p.getHeureFin());
                    return dateMatch && statutValide;
                })
                .collect(Collectors.toList());
            
            System.out.println("DEBUG: Cours trouvés pour cette date: " + coursJour.size());
            
            // Récupérer toutes les soutenances (pas seulement validées)
            List<Soutenance> toutesLesSoutenances = soutenanceRepository.findAll().stream()
                .filter(s -> s.getUser() != null && s.getUser().getIdUser().equals(enseignantId))
                .collect(Collectors.toList());
            System.out.println("DEBUG: Nombre total de soutenances trouvées: " + toutesLesSoutenances.size());
            
            // Filtrer pour cette date et statut valide
            List<Soutenance> soutenancesJour = toutesLesSoutenances.stream()
                .filter(s -> {
                    boolean dateMatch = s.getDate().equals(dateRattrapageSQL);
                    boolean statutValide = "valide".equals(s.getStatutValidation());
                    System.out.println("DEBUG: Soutenance ID " + s.getIdSoutenance() + 
                                     " - Date: " + s.getDate() + " (match: " + dateMatch + ")" +
                                     " - Statut: " + s.getStatutValidation() + " (valide: " + statutValide + ")" +
                                     " - Heure: " + s.getHeureTime() + 
                                     " - Durée: " + s.getDuree());
                    return dateMatch && statutValide;
                })
                .collect(Collectors.toList());
            
            System.out.println("DEBUG: Soutenances trouvées pour cette date: " + soutenancesJour.size());
            
            // Récupérer les autres rattrapages approuvés de l'enseignant
            List<Rattrapage> rattrapagesApprouves = rattrapageRepository.findAll().stream()
                .filter(r -> r.getIdEnseignant().equals(enseignantId) && "approuve".equals(r.getStatut()))
                .collect(Collectors.toList());
            System.out.println("DEBUG: Nombre total de rattrapages approuvés trouvés: " + rattrapagesApprouves.size());
            
            // Filtrer pour cette date
            List<Rattrapage> rattrapagesJour = rattrapagesApprouves.stream()
                .filter(r -> {
                    boolean dateMatch = Date.valueOf(r.getDateRattrapageProposee()).equals(dateRattrapageSQL);
                    System.out.println("DEBUG: Rattrapage ID " + r.getIdRattrapage() + 
                                     " - Date: " + r.getDateRattrapageProposee() + " (match: " + dateMatch + ")" +
                                     " - Heures: " + r.getHeureDebutRattrapage() + "-" + r.getHeureFinRattrapage());
                    return dateMatch;
                })
                .collect(Collectors.toList());
            
            System.out.println("DEBUG: Rattrapages trouvés pour cette date: " + rattrapagesJour.size());
            
            // Vérifier les chevauchements avec les cours
            List<String> conflits = new ArrayList<>();
            for (Planning cours : coursJour) {
                boolean chevauche = creneauxSeChevauchent(heureDebutSQL, heureFinSQL, 
                                        cours.getHeureDebut(), cours.getHeureFin());
                System.out.println("DEBUG: Vérification cours " + cours.getIdPlanning() + 
                                 " (" + cours.getHeureDebut() + "-" + cours.getHeureFin() + ")" +
                                 " vs rattrapage (" + heureDebutSQL + "-" + heureFinSQL + ")" +
                                 " -> Chevauche: " + chevauche);
                if (chevauche) {
                    conflits.add("Conflit avec cours " + cours.getTypePlanning() + 
                               " (" + cours.getHeureDebut() + "-" + cours.getHeureFin() + ")");
                }
            }
            
            // Vérifier les chevauchements avec les soutenances
            for (Soutenance soutenance : soutenancesJour) {
                Time heureFinSoutenance = calculerHeureFinTime(soutenance.getHeureTime(), soutenance.getDuree());
                boolean chevauche = creneauxSeChevauchent(heureDebutSQL, heureFinSQL, 
                                        soutenance.getHeureTime(), heureFinSoutenance);
                System.out.println("DEBUG: Vérification soutenance " + soutenance.getIdSoutenance() + 
                                 " (" + soutenance.getHeureTime() + "-" + heureFinSoutenance + ")" +
                                 " vs rattrapage (" + heureDebutSQL + "-" + heureFinSQL + ")" +
                                 " -> Chevauche: " + chevauche);
                if (chevauche) {
                    conflits.add("Soutenance de " + soutenance.getHeureTime() + " à " + heureFinSoutenance);
                }
            }
            
            // Vérifier les chevauchements avec les autres rattrapages approuvés
            for (Rattrapage rattrapage : rattrapagesJour) {
                Time heureDebutRattrapage = Time.valueOf(rattrapage.getHeureDebutRattrapage() + ":00");
                Time heureFinRattrapage = Time.valueOf(rattrapage.getHeureFinRattrapage() + ":00");
                boolean chevauche = creneauxSeChevauchent(heureDebutSQL, heureFinSQL, 
                                        heureDebutRattrapage, heureFinRattrapage);
                System.out.println("DEBUG: Vérification rattrapage " + rattrapage.getIdRattrapage() + 
                                 " (" + heureDebutRattrapage + "-" + heureFinRattrapage + ")" +
                                 " vs nouveau rattrapage (" + heureDebutSQL + "-" + heureFinSQL + ")" +
                                 " -> Chevauche: " + chevauche);
                if (chevauche) {
                    conflits.add("Rattrapage existant de " + heureDebutRattrapage + " à " + heureFinRattrapage);
                }
            }
            
            System.out.println("DEBUG: Nombre total de conflits détectés: " + conflits.size());
            
            boolean disponible = conflits.isEmpty();
            Map<String, Object> response = new HashMap<>();
            response.put("disponible", disponible);
            
            if (!disponible) {
                response.put("conflits", conflits);
                response.put("message", "Créneau non disponible - chevauchement détecté");
            } else {
                response.put("message", "Créneau disponible");
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur lors de la vérification: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Déterminer le type de planning (cour ou soutenance) basé sur la demande
     */
    private String determinerTypePlanning(Rattrapage rattrapage) {
        String matiere = rattrapage.getMatiere().toLowerCase();
        String motif = rattrapage.getMotif().toLowerCase();
        
        // Si c'est lié à une soutenance
        if (matiere.contains("soutenance") || matiere.contains("pfe") || 
            matiere.contains("projet") || motif.contains("soutenance")) {
            return "soutenance";
        }
        
        // Par défaut, c'est un cours - utiliser "cour" pour correspondre à la table type_planning
        return "cour";
    }

    /**
     * Calculer l'heure de fin à partir de l'heure de début et de la durée (pour soutenances)
     */
    private String calculerHeureFin(Time heureDebut, String duree) {
        try {
            // Convertir la durée en minutes (format attendu: "90" pour 90 minutes)
            int dureeMinutes = Integer.parseInt(duree);
            
            // Convertir Time en LocalTime pour faciliter les calculs
            LocalTime heureDebutLocal = heureDebut.toLocalTime();
            LocalTime heureFinLocal = heureDebutLocal.plusMinutes(dureeMinutes);
            
            return heureFinLocal.toString();
        } catch (Exception e) {
            // En cas d'erreur, retourner une durée par défaut de 2h
            LocalTime heureDebutLocal = heureDebut.toLocalTime();
            return heureDebutLocal.plusHours(2).toString();
        }
    }

    /**
     * Calculer l'heure de fin en Time à partir de l'heure de début et de la durée
     */
    private Time calculerHeureFinTime(Time heureDebut, String duree) {
        try {
            int dureeMinutes = Integer.parseInt(duree);
            LocalTime heureDebutLocal = heureDebut.toLocalTime();
            LocalTime heureFinLocal = heureDebutLocal.plusMinutes(dureeMinutes);
            return Time.valueOf(heureFinLocal);
        } catch (Exception e) {
            LocalTime heureDebutLocal = heureDebut.toLocalTime();
            return Time.valueOf(heureDebutLocal.plusHours(2));
        }
    }

    /**
     * Vérifier si deux créneaux horaires se chevauchent
     */
    private boolean creneauxSeChevauchent(Time debut1, Time fin1, Time debut2, Time fin2) {
        // Convertir en LocalTime pour faciliter les comparaisons
        LocalTime d1 = debut1.toLocalTime();
        LocalTime f1 = fin1.toLocalTime();
        LocalTime d2 = debut2.toLocalTime();
        LocalTime f2 = fin2.toLocalTime();
        
        // Deux créneaux se chevauchent si :
        // - Le début du premier est avant la fin du second ET
        // - Le début du second est avant la fin du premier
        return d1.isBefore(f2) && d2.isBefore(f1);
    }

    /**
     * Méthode utilitaire pour extraire le token
     */
    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
