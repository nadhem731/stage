package com.sys_res.esp.controller;

import com.microsoft.graph.models.OnlineMeeting;
import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.PlanningRepository;
import com.sys_res.esp.repository.UsersRepository;
import com.sys_res.esp.service.MicrosoftTeamsService;
import com.sys_res.esp.service.EmailService;
import com.sys_res.esp.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.*;

@RestController
@RequestMapping("/api/teams")
@CrossOrigin(origins = "http://localhost:3000")
public class TeamsController {

    @Autowired
    private MicrosoftTeamsService teamsService;

    @Autowired
    private PlanningRepository planningRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailService emailService;

    @GetMapping("/meeting-link/{planningId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ENSEIGNANT', 'ROLE_ADMIN')")
    public ResponseEntity<?> getMeetingLink(@PathVariable Long planningId, HttpServletRequest request) {
        try {
            // Récupérer le token et l'utilisateur connecté
            String token = extractTokenFromRequest(request);
            if (token == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Token manquant"));
            }

            String identifiant = jwtUtil.getIdentifiantFromToken(token);
            Users currentUser = usersRepository.findByIdentifiant(identifiant).orElse(null);
            
            if (currentUser == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Utilisateur non trouvé"));
            }

            // Récupérer le planning
            Optional<Planning> planningOpt = planningRepository.findById(planningId.intValue());
            if (!planningOpt.isPresent()) {
                return ResponseEntity.status(404).body(Map.of("error", "Planning non trouvé"));
            }

            Planning planning = planningOpt.get();

            // Vérifier que c'est un cours en ligne
            if (!"en_ligne".equals(planning.getModeCours())) {
                return ResponseEntity.status(400).body(Map.of("error", "Ce cours n'est pas en ligne"));
            }

            // Vérifier que l'enseignant connecté est bien l'enseignant du cours
            if (!planning.getUser().getIdUser().equals(currentUser.getIdUser())) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès non autorisé à ce cours"));
            }

            // Récupérer les emails des étudiants de la classe
            List<String> studentEmails = getStudentEmailsForClass(planning.getClasse().getIdClasse().longValue());

            try {
                System.out.println("DEBUG Teams: Tentative de création réunion pour planning ID: " + planningId);
                System.out.println("DEBUG Teams: Emails étudiants: " + studentEmails);
                
                // Créer ou récupérer la réunion Teams
                OnlineMeeting meeting = teamsService.createTeamsMeeting(planning, studentEmails);
                System.out.println("DEBUG Teams: Réunion créée avec succès");
                
                String joinUrl = teamsService.extractJoinUrl(meeting);
                System.out.println("DEBUG Teams: URL de réunion extraite: " + (joinUrl != null ? "Succès" : "Échec"));

                if (joinUrl != null) {
                    // Envoyer les emails aux étudiants avec le lien Teams
                    try {
                        System.out.println("DEBUG Teams: Envoi des emails aux étudiants...");
                        emailService.sendTeamsMeetingEmailToStudents(planning, joinUrl, studentEmails);
                        System.out.println("DEBUG Teams: Emails envoyés avec succès à " + studentEmails.size() + " étudiants");
                    } catch (Exception emailError) {
                        System.err.println("ERREUR Teams: Échec de l'envoi des emails: " + emailError.getMessage());
                        // Continue même si l'envoi d'email échoue
                    }
                    
                    return ResponseEntity.ok(Map.of(
                        "meetingUrl", joinUrl,
                        "meetingId", teamsService.extractMeetingId(meeting),
                        "coursInfo", Map.of(
                            "classe", planning.getClasse().getNomClasse(),
                            "horaire", planning.getHeureDebut() + " - " + planning.getHeureFin(),
                            "date", planning.getDateDebut().toString()
                        ),
                        "emailsSent", studentEmails.size()
                    ));
                } else {
                    return ResponseEntity.status(500).body(Map.of("error", "Impossible de générer le lien Teams"));
                }
            } catch (Exception e) {
                System.out.println("DEBUG Teams: Erreur lors de la création de la réunion: " + e.getMessage());
                e.printStackTrace();
                
                // En cas d'erreur avec Microsoft Graph, générer un lien de démonstration
                String demoUrl = generateDemoTeamsUrl(planning);
                System.out.println("DEBUG Teams: Génération lien de démonstration: " + demoUrl);
                
                // Envoyer les emails aux étudiants même avec le lien de démonstration
                try {
                    System.out.println("DEBUG Teams: Envoi des emails de démonstration aux étudiants...");
                    emailService.sendTeamsMeetingEmailToStudents(planning, demoUrl, studentEmails);
                    System.out.println("DEBUG Teams: Emails de démonstration envoyés avec succès à " + studentEmails.size() + " étudiants");
                } catch (Exception emailError) {
                    System.err.println("ERREUR Teams: Échec de l'envoi des emails de démonstration: " + emailError.getMessage());
                    // Continue même si l'envoi d'email échoue
                }
                
                return ResponseEntity.ok(Map.of(
                    "meetingUrl", demoUrl,
                    "meetingId", "demo-" + planningId,
                    "coursInfo", Map.of(
                        "classe", planning.getClasse().getNomClasse(),
                        "horaire", planning.getHeureDebut() + " - " + planning.getHeureFin(),
                        "date", planning.getDateDebut().toString()
                    ),
                    "emailsSent", studentEmails.size(),
                    "note", "Lien de démonstration - Service Teams non disponible"
                ));
            }

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erreur interne: " + e.getMessage()));
        }
    }

    @PostMapping("/create-meeting")
    @PreAuthorize("hasAnyAuthority('ROLE_ENSEIGNANT', 'ROLE_ADMIN')")
    public ResponseEntity<?> createMeeting(@RequestBody Map<String, Object> request, HttpServletRequest httpRequest) {
        try {
            Long planningId = Long.valueOf(request.get("planningId").toString());
            List<String> participantEmails = (List<String>) request.get("participantEmails");

            // Récupérer le planning
            Optional<Planning> planningOpt = planningRepository.findById(planningId.intValue());
            if (!planningOpt.isPresent()) {
                return ResponseEntity.status(404).body(Map.of("error", "Planning non trouvé"));
            }

            Planning planning = planningOpt.get();

            // Créer la réunion Teams
            OnlineMeeting meeting = teamsService.createTeamsMeeting(planning, participantEmails);
            
            return ResponseEntity.ok(Map.of(
                "meetingId", teamsService.extractMeetingId(meeting),
                "joinUrl", teamsService.extractJoinUrl(meeting),
                "subject", "Cours: " + planning.getTypePlanning(),
                "startTime", planning.getHeureDebut().toString(),
                "endTime", planning.getHeureFin().toString()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erreur lors de la création de la réunion: " + e.getMessage()));
        }
    }

    @DeleteMapping("/meeting/{meetingId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ENSEIGNANT', 'ROLE_ADMIN')")
    public ResponseEntity<?> deleteMeeting(@PathVariable String meetingId) {
        try {
            teamsService.deleteTeamsMeeting(meetingId);
            return ResponseEntity.ok(Map.of("message", "Réunion supprimée avec succès"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Erreur lors de la suppression: " + e.getMessage()));
        }
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private List<String> getStudentEmailsForClass(Long classeId) {
        // Récupérer les étudiants de la classe depuis la table Affectation
        List<Users> students = usersRepository.findStudentsByClasseId(classeId);
        List<String> emails = new ArrayList<>();
        
        for (Users student : students) {
            if (student.getEmail() != null && !student.getEmail().isEmpty()) {
                emails.add(student.getEmail());
            }
        }
        
        return emails;
    }

    private String generateDemoTeamsUrl(Planning planning) {
        // Générer un lien de démonstration pour les tests
        String baseUrl = "https://teams.microsoft.com/l/meetup-join/";
        String meetingId = "demo-" + planning.getIdPlanning() + "-" + System.currentTimeMillis();
        return baseUrl + meetingId + "?context=" + 
               "{\"Tid\":\"demo\",\"Oid\":\"demo\",\"MessageId\":\"" + meetingId + "\"}";
    }
}
