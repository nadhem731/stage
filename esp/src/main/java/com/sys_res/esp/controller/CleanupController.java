package com.sys_res.esp.controller;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.service.WeeklyCleanupService;

@RestController
@RequestMapping("/api/cleanup")
@CrossOrigin(origins = "http://localhost:3000")
public class CleanupController {

    @Autowired
    private WeeklyCleanupService weeklyCleanupService;

    /**
     * Déclencher le nettoyage hebdomadaire manuellement (Admin seulement)
     */
    @PostMapping("/weekly")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> declencherNettoyageHebdomadaire() {
        try {
            System.out.println("=== NETTOYAGE HEBDOMADAIRE DÉCLENCHÉ MANUELLEMENT ===");
            weeklyCleanupService.declencherNettoyageManuel();
            
            return ResponseEntity.ok().body(Map.of(
                "message", "Nettoyage hebdomadaire exécuté avec succès",
                "timestamp", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
            ));
            
        } catch (Exception e) {
            System.err.println("Erreur lors du nettoyage manuel: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Erreur lors du nettoyage: " + e.getMessage()
            ));
        }
    }

    /**
     * Déclencher le nettoyage complet manuellement (Admin seulement)
     */
    @PostMapping("/complete")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> declencherNettoyageComplet() {
        try {
            System.out.println("=== NETTOYAGE COMPLET DÉCLENCHÉ MANUELLEMENT ===");
            weeklyCleanupService.nettoyageComplet();
            
            return ResponseEntity.ok().body(Map.of(
                "message", "Nettoyage complet exécuté avec succès (suppression des éléments > 2 semaines)",
                "timestamp", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
            ));
            
        } catch (Exception e) {
            System.err.println("Erreur lors du nettoyage complet: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Erreur lors du nettoyage complet: " + e.getMessage()
            ));
        }
    }

    /**
     * Obtenir des informations sur le système de nettoyage
     */
    @GetMapping("/info")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<?> getCleanupInfo() {
        return ResponseEntity.ok().body(Map.of(
            "nettoyage_hebdomadaire", Map.of(
                "description", "Supprime les plannings, soutenances et rattrapages de la semaine précédente",
                "planification", "Chaque lundi à 00:01",
                "cron", "0 1 0 * * MON"
            ),
            "nettoyage_complet", Map.of(
                "description", "Supprime tous les éléments de plus de 2 semaines",
                "planification", "Chaque dimanche à 02:00",
                "cron", "0 0 2 * * SUN"
            ),
            "date_actuelle", LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE),
            "prochaine_execution_hebdomadaire", "Prochain lundi à 00:01",
            "prochaine_execution_complete", "Prochain dimanche à 02:00"
        ));
    }
}
