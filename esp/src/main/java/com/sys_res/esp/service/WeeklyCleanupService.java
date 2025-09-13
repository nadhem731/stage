package com.sys_res.esp.service;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.time.DayOfWeek;
import java.sql.Date;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sys_res.esp.entity.Planning;
import com.sys_res.esp.entity.Soutenance;
import com.sys_res.esp.entity.Rattrapage;
import com.sys_res.esp.repository.PlanningRepository;
import com.sys_res.esp.repository.SoutenanceRepository;
import com.sys_res.esp.repository.RattrapageRepository;

@Service
public class WeeklyCleanupService {

    @Autowired
    private PlanningRepository planningRepository;
    
    @Autowired
    private SoutenanceRepository soutenanceRepository;
    
    @Autowired
    private RattrapageRepository rattrapageRepository;

    /**
     * Nettoyage automatique chaque lundi à 00:01
     * Supprime UNIQUEMENT les plannings, soutenances et rattrapages antérieurs à la semaine courante
     */
    @Scheduled(cron = "0 1 0 * * MON") // Chaque lundi à 00:01
    @Transactional
    public void nettoyageHebdomadaire() {
        System.out.println("=== DÉBUT DU NETTOYAGE HEBDOMADAIRE ===");
        
        try {
            // Calculer la date limite : début de la semaine courante
            LocalDate aujourdhui = LocalDate.now();
            LocalDate debutSemaineCourante = aujourdhui.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            
            System.out.println("Suppression des éléments ANTÉRIEURS au: " + debutSemaineCourante);
            System.out.println("PRÉSERVATION des éléments à partir du: " + debutSemaineCourante + " (semaine courante et futures)");
            
            // Nettoyer uniquement les éléments antérieurs à la semaine courante
            nettoyerPlanningsAnterieurs(debutSemaineCourante);
            nettoyerSoutenancesAnterieures(debutSemaineCourante);
            nettoyerRattrapagesAnterieurs(debutSemaineCourante);
            
            System.out.println("=== NETTOYAGE HEBDOMADAIRE TERMINÉ ===");
            
        } catch (Exception e) {
            System.err.println("Erreur lors du nettoyage hebdomadaire: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Nettoyer les plannings antérieurs à la date limite (préserve semaine courante et futures)
     */
    private void nettoyerPlanningsAnterieurs(LocalDate dateLimit) {
        try {
            List<Planning> tousLesPlannings = planningRepository.findAll();
            List<Planning> planningsASupprimer = tousLesPlannings.stream()
                .filter(p -> p.getDateDebut() != null)
                .filter(p -> p.getDateDebut().toLocalDate().isBefore(dateLimit))
                .toList();
            
            if (!planningsASupprimer.isEmpty()) {
                System.out.println("Suppression de " + planningsASupprimer.size() + " plannings antérieurs au " + dateLimit);
                planningRepository.deleteAll(planningsASupprimer);
            } else {
                System.out.println("Aucun planning antérieur à supprimer");
            }
            
        } catch (Exception e) {
            System.err.println("Erreur lors du nettoyage des plannings: " + e.getMessage());
        }
    }

    /**
     * Nettoyer les soutenances antérieures à la date limite (préserve semaine courante et futures)
     */
    private void nettoyerSoutenancesAnterieures(LocalDate dateLimit) {
        try {
            List<Soutenance> soutenances = soutenanceRepository.findAll();
            List<Soutenance> soutenancesASupprimer = soutenances.stream()
                .filter(s -> s.getDate() != null)
                .filter(s -> s.getDate().toLocalDate().isBefore(dateLimit))
                .toList();
            
            if (!soutenancesASupprimer.isEmpty()) {
                System.out.println("Suppression de " + soutenancesASupprimer.size() + " soutenances antérieures au " + dateLimit);
                soutenanceRepository.deleteAll(soutenancesASupprimer);
            } else {
                System.out.println("Aucune soutenance antérieure à supprimer");
            }
            
        } catch (Exception e) {
            System.err.println("Erreur lors du nettoyage des soutenances: " + e.getMessage());
        }
    }

    /**
     * Nettoyer les rattrapages approuvés antérieurs à la date limite (préserve semaine courante et futures)
     */
    private void nettoyerRattrapagesAnterieurs(LocalDate dateLimit) {
        try {
            List<Rattrapage> rattrapages = rattrapageRepository.findAll();
            List<Rattrapage> rattrapagesASupprimer = rattrapages.stream()
                .filter(r -> "approuve".equals(r.getStatut()))
                .filter(r -> r.getDateRattrapageProposee() != null)
                .filter(r -> r.getDateRattrapageProposee().isBefore(dateLimit))
                .toList();
            
            if (!rattrapagesASupprimer.isEmpty()) {
                System.out.println("Suppression de " + rattrapagesASupprimer.size() + " rattrapages approuvés antérieurs au " + dateLimit);
                rattrapageRepository.deleteAll(rattrapagesASupprimer);
            } else {
                System.out.println("Aucun rattrapage approuvé antérieur à supprimer");
            }
            
        } catch (Exception e) {
            System.err.println("Erreur lors du nettoyage des rattrapages: " + e.getMessage());
        }
    }

    /**
     * Méthode manuelle pour déclencher le nettoyage (pour tests)
     */
    public void declencherNettoyageManuel() {
        System.out.println("=== NETTOYAGE MANUEL DÉCLENCHÉ ===");
        nettoyageHebdomadaire();
    }

    /**
     * Nettoyer tous les anciens éléments (plus de 2 semaines)
     */
    @Scheduled(cron = "0 0 2 * * SUN") // Chaque dimanche à 02:00
    @Transactional
    public void nettoyageComplet() {
        System.out.println("=== DÉBUT DU NETTOYAGE COMPLET (ÉLÉMENTS > 2 SEMAINES) ===");
        
        try {
            LocalDate dateLimit = LocalDate.now().minusWeeks(2);
            
            // Nettoyer les plannings anciens
            List<Planning> anciensplannings = planningRepository.findAll().stream()
                .filter(p -> p.getDateDebut() != null)
                .filter(p -> p.getDateDebut().toLocalDate().isBefore(dateLimit))
                .toList();
            
            if (!anciensplannings.isEmpty()) {
                System.out.println("Suppression de " + anciensplannings.size() + " plannings anciens (> 2 semaines)");
                planningRepository.deleteAll(anciensplannings);
            }
            
            // Nettoyer les soutenances anciennes
            List<Soutenance> anciennesSoutenances = soutenanceRepository.findAll().stream()
                .filter(s -> s.getDate() != null)
                .filter(s -> s.getDate().toLocalDate().isBefore(dateLimit))
                .toList();
            
            if (!anciennesSoutenances.isEmpty()) {
                System.out.println("Suppression de " + anciennesSoutenances.size() + " soutenances anciennes (> 2 semaines)");
                soutenanceRepository.deleteAll(anciennesSoutenances);
            }
            
            // Nettoyer les rattrapages anciens approuvés
            List<Rattrapage> anciensRattrapages = rattrapageRepository.findAll().stream()
                .filter(r -> "approuve".equals(r.getStatut()))
                .filter(r -> r.getDateRattrapageProposee() != null)
                .filter(r -> r.getDateRattrapageProposee().isBefore(dateLimit))
                .toList();
            
            if (!anciensRattrapages.isEmpty()) {
                System.out.println("Suppression de " + anciensRattrapages.size() + " rattrapages anciens (> 2 semaines)");
                rattrapageRepository.deleteAll(anciensRattrapages);
            }
            
            System.out.println("=== NETTOYAGE COMPLET TERMINÉ ===");
            
        } catch (Exception e) {
            System.err.println("Erreur lors du nettoyage complet: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
