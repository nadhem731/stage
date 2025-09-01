package com.sys_res.esp.controller;

import com.microsoft.graph.models.OnlineMeeting;
import com.sys_res.esp.config.MicrosoftGraphConfig;
import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.entity.Soutenance;
import com.sys_res.esp.entity.Rattrapage;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.service.MicrosoftCalendarService;
import com.sys_res.esp.service.MicrosoftMailService;
import com.sys_res.esp.service.MicrosoftTeamsService;
import com.sys_res.esp.service.UsersService;
import com.sys_res.esp.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/microsoft")
@CrossOrigin(origins = "http://localhost:3000")
public class MicrosoftIntegrationController {

    @Autowired
    private MicrosoftGraphConfig microsoftGraphConfig;

    @Autowired
    private MicrosoftCalendarService calendarService;

    @Autowired
    private MicrosoftMailService mailService;

    @Autowired
    private MicrosoftTeamsService teamsService;

    @Autowired
    private UsersService usersService;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/status")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> getMicrosoftStatus() {
        Map<String, Object> response = new HashMap<>();
        response.put("configured", microsoftGraphConfig.isMicrosoftConfigured());
        response.put("services", Map.of(
            "calendar", microsoftGraphConfig.isMicrosoftConfigured(),
            "mail", microsoftGraphConfig.isMicrosoftConfigured(),
            "teams", microsoftGraphConfig.isMicrosoftConfigured()
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/calendar/sync-planning")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> syncPlanningToCalendar(
            @RequestBody Planning planning,
            HttpServletRequest request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (!microsoftGraphConfig.isMicrosoftConfigured()) {
                response.put("success", false);
                response.put("message", "Microsoft Graph non configuré");
                return ResponseEntity.badRequest().body(response);
            }

            // Récupérer l'utilisateur depuis le token
            String token = request.getHeader("Authorization");
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                Long userId = jwtUtil.extractUserId(token);
Users user = usersService.findById(userId).orElse(null);
                
                String eventId = calendarService.createCalendarEvent(planning, user.getEmail());
                
                response.put("success", true);
                response.put("eventId", eventId);
                response.put("message", "Événement créé dans le calendrier");
            } else {
                response.put("success", false);
                response.put("message", "Token d'authentification manquant");
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Erreur: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/calendar/sync-soutenance")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> syncSoutenanceToCalendar(
            @RequestBody Soutenance soutenance,
            HttpServletRequest request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (!microsoftGraphConfig.isMicrosoftConfigured()) {
                response.put("success", false);
                response.put("message", "Microsoft Graph non configuré");
                return ResponseEntity.badRequest().body(response);
            }

            String token = request.getHeader("Authorization");
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                Long userId = jwtUtil.extractUserId(token);
Users user = usersService.findById(userId).orElse(null);
                
                String eventId = calendarService.createSoutenanceEvent(soutenance, user.getEmail());
                
                response.put("success", true);
                response.put("eventId", eventId);
                response.put("message", "Soutenance créée dans le calendrier");
            } else {
                response.put("success", false);
                response.put("message", "Token d'authentification manquant");
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Erreur: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mail/send-planning-notification")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> sendPlanningNotification(
            @RequestBody Map<String, Object> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (!microsoftGraphConfig.isMicrosoftConfigured()) {
                response.put("success", false);
                response.put("message", "Microsoft Graph non configuré");
                return ResponseEntity.badRequest().body(response);
            }

            // Extraire les données de la requête
            Planning planning = (Planning) request.get("planning");
            String recipientEmail = (String) request.get("recipientEmail");
            String recipientName = (String) request.get("recipientName");
            
            mailService.sendPlanningNotification(planning, recipientEmail, recipientName);
            
            response.put("success", true);
            response.put("message", "Notification envoyée avec succès");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Erreur: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/mail/send-rattrapage-notification")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> sendRattrapageNotification(
            @RequestBody Map<String, Object> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (!microsoftGraphConfig.isMicrosoftConfigured()) {
                response.put("success", false);
                response.put("message", "Microsoft Graph non configuré");
                return ResponseEntity.badRequest().body(response);
            }

            Rattrapage rattrapage = (Rattrapage) request.get("rattrapage");
            String recipientEmail = (String) request.get("recipientEmail");
            String recipientName = (String) request.get("recipientName");
            String status = (String) request.get("status");
            
            mailService.sendRattrapageNotification(rattrapage, recipientEmail, recipientName, status);
            
            response.put("success", true);
            response.put("message", "Notification de rattrapage envoyée");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Erreur: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/teams/create-meeting")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> createTeamsMeeting(
            @RequestBody Map<String, Object> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (!microsoftGraphConfig.isMicrosoftConfigured()) {
                response.put("success", false);
                response.put("message", "Microsoft Graph non configuré");
                return ResponseEntity.badRequest().body(response);
            }

            Planning planning = (Planning) request.get("planning");
            @SuppressWarnings("unchecked")
            List<String> participantEmails = (List<String>) request.get("participantEmails");
            
            OnlineMeeting meeting = teamsService.createTeamsMeeting(planning, participantEmails);
            
            response.put("success", true);
            response.put("meetingId", meeting.id);
            response.put("joinUrl", meeting.joinWebUrl);
            response.put("message", "Réunion Teams créée avec succès");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Erreur: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/teams/create-soutenance-meeting")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> createSoutenanceTeamsMeeting(
            @RequestBody Map<String, Object> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (!microsoftGraphConfig.isMicrosoftConfigured()) {
                response.put("success", false);
                response.put("message", "Microsoft Graph non configuré");
                return ResponseEntity.badRequest().body(response);
            }

            Soutenance soutenance = (Soutenance) request.get("soutenance");
            @SuppressWarnings("unchecked")
            List<String> juryEmails = (List<String>) request.get("juryEmails");
            String studentEmail = (String) request.get("studentEmail");
            
            OnlineMeeting meeting = teamsService.createSoutenanceTeamsMeeting(soutenance, juryEmails, studentEmail);
            
            response.put("success", true);
            response.put("meetingId", meeting.id);
            response.put("joinUrl", meeting.joinWebUrl);
            response.put("message", "Réunion Teams soutenance créée");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Erreur: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/calendar/event/{eventId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> deleteCalendarEvent(@PathVariable String eventId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (!microsoftGraphConfig.isMicrosoftConfigured()) {
                response.put("success", false);
                response.put("message", "Microsoft Graph non configuré");
                return ResponseEntity.badRequest().body(response);
            }

            // Récupérer l'utilisateur connecté
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userEmail = authentication.getName();

            calendarService.deleteCalendarEvent(eventId, userEmail);
            
            response.put("success", true);
            response.put("message", "Événement supprimé du calendrier");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Erreur: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/teams/meeting/{meetingId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_ENSEIGNANT')")
    public ResponseEntity<Map<String, Object>> deleteTeamsMeeting(@PathVariable String meetingId) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (!microsoftGraphConfig.isMicrosoftConfigured()) {
                response.put("success", false);
                response.put("message", "Microsoft Graph non configuré");
                return ResponseEntity.badRequest().body(response);
            }

            teamsService.deleteTeamsMeeting(meetingId);
            
            response.put("success", true);
            response.put("message", "Réunion Teams supprimée");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Erreur: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bulk-sync")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> bulkSyncToMicrosoft(
            @RequestBody Map<String, Object> request) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (!microsoftGraphConfig.isMicrosoftConfigured()) {
                response.put("success", false);
                response.put("message", "Microsoft Graph non configuré");
                return ResponseEntity.badRequest().body(response);
            }

            @SuppressWarnings("unchecked")
            List<Planning> plannings = (List<Planning>) request.get("plannings");
            @SuppressWarnings("unchecked")
            List<Soutenance> soutenances = (List<Soutenance>) request.get("soutenances");
            boolean createCalendarEvents = (Boolean) request.getOrDefault("createCalendarEvents", false);
            boolean createTeamsMeetings = (Boolean) request.getOrDefault("createTeamsMeetings", false);
            boolean sendNotifications = (Boolean) request.getOrDefault("sendNotifications", false);

            int successCount = 0;
            int errorCount = 0;

            // Synchroniser les plannings
            if (plannings != null) {
                for (Planning planning : plannings) {
                    try {
                        if (createCalendarEvents) {
                            calendarService.createCalendarEvent(planning, planning.getUser().getEmail());
                        }
                        
                        if (createTeamsMeetings && "en_ligne".equals(planning.getModeCours())) {
                            // Créer réunion Teams pour cours en ligne
                            teamsService.createTeamsMeeting(planning, List.of(planning.getUser().getEmail()));
                        }
                        
                        successCount++;
                    } catch (Exception e) {
                        errorCount++;
                        System.err.println("Erreur sync planning: " + e.getMessage());
                    }
                }
            }

            // Synchroniser les soutenances
            if (soutenances != null) {
                for (Soutenance soutenance : soutenances) {
                    try {
                        if (createCalendarEvents) {
                            calendarService.createSoutenanceEvent(soutenance, "admin@esprit.tn");
                        }
                        
                        if (createTeamsMeetings) {
                            // Créer réunion Teams pour soutenance
                            teamsService.createSoutenanceTeamsMeeting(soutenance, List.of(), null);
                        }
                        
                        successCount++;
                    } catch (Exception e) {
                        errorCount++;
                        System.err.println("Erreur sync soutenance: " + e.getMessage());
                    }
                }
            }

            response.put("success", true);
            response.put("successCount", successCount);
            response.put("errorCount", errorCount);
            response.put("message", String.format("Synchronisation terminée: %d succès, %d erreurs", successCount, errorCount));
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Erreur: " + e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }
}
