package com.sys_res.esp.controller;

import java.sql.Date;
import java.sql.Time;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

import com.sys_res.esp.entity.Salle;
import com.sys_res.esp.entity.Soutenance;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.SalleRepository;
import com.sys_res.esp.repository.SoutenanceRepository;
import com.sys_res.esp.repository.UsersRepository;
import com.sys_res.esp.service.EmailService;

@RestController
@RequestMapping("/api/soutenances")
@CrossOrigin(origins = "http://localhost:3000")
public class SoutenanceController {
    @Autowired
    private SoutenanceRepository soutenanceRepository;
    
    @Autowired
    private SalleRepository salleRepository;
    
    @Autowired
    private UsersRepository usersRepository;
    
    @Autowired
    private EmailService emailService;

    @GetMapping
    public List<Soutenance> getAllSoutenances() {
        return soutenanceRepository.findAll();
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_ENSEIGNANT')")
    public ResponseEntity<String> getSoutenanceStatus() {
        try {
            boolean hasValidated = soutenanceRepository.hasValidatedSoutenances();
            return ResponseEntity.ok(hasValidated ? "valide" : "en_cours");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("en_cours");
        }
    }

    @GetMapping("/enseignant")
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<Soutenance>> getSoutenancesByEnseignant() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            System.out.println("DEBUG: Recherche des soutenances pour l'enseignant: " + username);
            
            Users currentUser = usersRepository.findByIdentifiant(username)
                                               .orElseThrow(() -> new RuntimeException("User not found with identifiant: " + username));
            
            System.out.println("DEBUG: Utilisateur trouvé - ID: " + currentUser.getIdUser() + ", Nom: " + currentUser.getNom());
            
            // Récupérer les soutenances où l'enseignant est membre du jury avec statut validé
            List<Soutenance> soutenances = soutenanceRepository.findValidatedSoutenancesByJuryMember(currentUser.getIdUser());
            System.out.println("DEBUG: Nombre de soutenances trouvées: " + soutenances.size());
            
            if (!soutenances.isEmpty()) {
                System.out.println("DEBUG: Première soutenance - Date: " + soutenances.get(0).getDate() + 
                                 ", Heure: " + soutenances.get(0).getHeureTime() + 
                                 ", Étudiant: " + (soutenances.get(0).getUser() != null ? soutenances.get(0).getUser().getNom() : "null") +
                                 ", Salle: " + (soutenances.get(0).getSalle() != null ? soutenances.get(0).getSalle().getNumSalle() : "null"));
            }
            
            return ResponseEntity.ok(soutenances);
        } catch (Exception e) {
            System.err.println("ERROR: Erreur lors de la récupération des soutenances: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    // Endpoint pour récupérer les soutenances formatées pour les demandes de rattrapage
    @GetMapping("/seances/enseignant")
    @PreAuthorize("hasRole('ROLE_ENSEIGNANT') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getSeancesSoutenanceEnseignant() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            
            Users currentUser = usersRepository.findByIdentifiant(username)
                                               .orElseThrow(() -> new RuntimeException("User not found with identifiant: " + username));
            
            // Récupérer les soutenances où l'enseignant est membre du jury
            List<Soutenance> soutenances = soutenanceRepository.findValidatedSoutenancesByJuryMember(currentUser.getIdUser());
            
            // Convertir en format unifié pour le frontend
            List<Map<String, Object>> seances = new ArrayList<>();
            
            for (Soutenance soutenance : soutenances) {
                Map<String, Object> seance = new HashMap<>();
                seance.put("id", soutenance.getIdSoutenance());
                seance.put("type", "soutenance");
                seance.put("date", soutenance.getDate() != null ? soutenance.getDate().toString() : "");
                seance.put("heureDebut", soutenance.getHeureTime() != null ? soutenance.getHeureTime().toString() : "");
                
                // Calculer heure de fin (durée de 195 minutes comme les cours)
                if (soutenance.getHeureTime() != null) {
                    Time heureFin = new Time(soutenance.getHeureTime().getTime() + (195 * 60 * 1000));
                    seance.put("heureFin", heureFin.toString());
                } else {
                    seance.put("heureFin", "");
                }
                
                seance.put("classe", "Soutenance");
                seance.put("matiere", "Soutenance PFE");
                seance.put("salle", soutenance.getSalle() != null ? soutenance.getSalle().getNumSalle() : "");
                seance.put("etudiant", soutenance.getUser() != null ? soutenance.getUser().getNom() + " " + soutenance.getUser().getPrenom() : "");
                seances.add(seance);
            }
            
            return ResponseEntity.ok(seances);
        } catch (Exception e) {
            System.err.println("ERROR: Erreur lors de la récupération des séances soutenances: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping
    public Soutenance createSoutenance(@RequestBody Soutenance soutenance) {
        return soutenanceRepository.save(soutenance);
    }
    
    @PostMapping("/save-planning")
    public ResponseEntity<?> savePlanningSoutenances(@RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> planningSoutenances = (List<Map<String, Object>>) request.get("planning_soutenances");
            
            System.out.println("DEBUG: Données reçues pour sauvegarde: " + request);
            System.out.println("DEBUG: Nombre de soutenances à sauvegarder: " + planningSoutenances.size());
            
            // Supprimer toutes les anciennes soutenances avant de sauvegarder les nouvelles
            List<Soutenance> existingSoutenances = soutenanceRepository.findAll();
            if (!existingSoutenances.isEmpty()) {
                System.out.println("DEBUG: Suppression de " + existingSoutenances.size() + " anciennes soutenances");
                soutenanceRepository.deleteAll(existingSoutenances);
            }
            
            for (Map<String, Object> soutenanceData : planningSoutenances) {
                System.out.println("DEBUG: Données soutenance: " + soutenanceData);
                Soutenance soutenance = new Soutenance();
                
                // Date de soutenance
                String dateStr = (String) soutenanceData.get("date_soutenance");
                if (dateStr != null && !dateStr.equals("À définir")) {
                    soutenance.setDate(Date.valueOf(dateStr));
                }
                
                // Heure de début (90 minutes de durée)
                String heureDebut = (String) soutenanceData.get("heure_debut");
                if (heureDebut != null) {
                    soutenance.setHeureTime(Time.valueOf(heureDebut + ":00"));
                }
                
                // Durée fixe de 90 minutes
                soutenance.setDuree("90 minutes");
                

                String jour = (String) soutenanceData.get("jour");
                System.out.println("DEBUG: Jour récupéré: " + jour);
                if (jour != null) {
                    soutenance.setJour(jour);
                    System.out.println("DEBUG: Jour assigné à la soutenance: " + jour);
                } else {
                    System.out.println("DEBUG: ATTENTION - Le champ 'jour' est null dans les données reçues");
                }
                
                // Salle
                Integer idSalle = (Integer) soutenanceData.get("id_salle");
                if (idSalle != null) {
                    Salle salle = salleRepository.findById(idSalle.longValue()).orElse(null);
                    if (salle != null) {
                        soutenance.setSalle(salle);
                    }
                }
                
                // Étudiant
                Integer idEtudiant = (Integer) soutenanceData.get("id_etudiant");
                if (idEtudiant != null) {
                    Users etudiant = usersRepository.findById(idEtudiant.longValue()).orElse(null);
                    if (etudiant != null) {
                        soutenance.setUser(etudiant);
                    }
                }
                
                // Marquer comme validé lors de la sauvegarde
                soutenance.setStatutValidation("valide");
                
                soutenanceRepository.save(soutenance);
            }
            
            // Envoyer l'email de notification à tous les enseignants après validation réussie des soutenances
            // ET synchroniser automatiquement avec Microsoft Calendar
            try {
                emailService.sendPlanningNotificationToAllTeachers();
                System.out.println("DEBUG: Emails et synchronisation Microsoft Calendar terminés pour toutes les soutenances");
            } catch (Exception emailException) {
                // Log l'erreur mais ne pas faire échouer la sauvegarde
                System.err.println("Erreur lors de l'envoi des emails de soutenance ou synchronisation Calendar: " + emailException.getMessage());
            }
            
            // Envoyer l'email de soutenance aux étudiants concernés
            try {
                List<Soutenance> savedSoutenances = soutenanceRepository.findByStatutValidation("valide");
                emailService.sendSoutenanceScheduleToStudents(savedSoutenances);
            } catch (Exception emailException) {
                System.err.println("Erreur lors de l'envoi des emails de soutenance aux étudiants: " + emailException.getMessage());
            }
            
            return ResponseEntity.ok().body(Map.of("message", "Planning de soutenances sauvegardé avec succès"));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", "Erreur lors de la sauvegarde: " + e.getMessage()));
        }
    }
}