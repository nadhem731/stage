package com.sys_res.esp.repository;

import com.sys_res.esp.entity.Rattrapage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface RattrapageRepository extends JpaRepository<Rattrapage, Long> {
    
    // Trouver toutes les demandes d'un enseignant
    List<Rattrapage> findByIdEnseignantOrderByDateCreationDesc(Long idEnseignant);
    
    // Trouver les demandes par statut
    List<Rattrapage> findByStatutOrderByDateCreationDesc(String statut);
    
    // Trouver les demandes d'un enseignant par statut
    List<Rattrapage> findByIdEnseignantAndStatutOrderByDateCreationDesc(Long idEnseignant, String statut);
    
    // Compter les demandes par statut pour un enseignant
    @Query("SELECT COUNT(r) FROM Rattrapage r WHERE r.idEnseignant = :idEnseignant AND r.statut = :statut")
    Long countByEnseignantAndStatut(@Param("idEnseignant") Long idEnseignant, @Param("statut") String statut);
    
    // Trouver les demandes récentes (derniers 30 jours)
    @Query("SELECT r FROM Rattrapage r WHERE r.dateCreation >= :dateDebut ORDER BY r.dateCreation DESC")
    List<Rattrapage> findRecentDemandes(@Param("dateDebut") LocalDate dateDebut);
    
    // Trouver les demandes par période
    @Query("SELECT r FROM Rattrapage r WHERE r.dateAbsence BETWEEN :dateDebut AND :dateFin ORDER BY r.dateAbsence DESC")
    List<Rattrapage> findByPeriode(@Param("dateDebut") LocalDate dateDebut, @Param("dateFin") LocalDate dateFin);
    
    // Vérifier s'il existe déjà une demande pour une séance spécifique
    @Query("SELECT COUNT(r) > 0 FROM Rattrapage r WHERE r.idSeance = :idSeance AND r.idEnseignant = :idEnseignant")
    boolean existsBySeanceAndEnseignant(@Param("idSeance") Long idSeance, @Param("idEnseignant") Long idEnseignant);
    
    // Statistiques pour le dashboard admin
    @Query("SELECT r.statut, COUNT(r) FROM Rattrapage r GROUP BY r.statut")
    List<Object[]> getStatistiquesParStatut();
    
    // Demandes en attente pour un enseignant spécifique
    @Query("SELECT r FROM Rattrapage r WHERE r.idEnseignant = :idEnseignant AND r.statut = 'en_attente' ORDER BY r.dateCreation DESC")
    List<Rattrapage> findDemandesEnAttenteByEnseignant(@Param("idEnseignant") Long idEnseignant);
    
    // Toutes les demandes pour l'admin (avec pagination possible)
    @Query("SELECT r FROM Rattrapage r ORDER BY r.dateCreation DESC")
    List<Rattrapage> findAllOrderByDateCreationDesc();
    
    // Recherche par classe
    List<Rattrapage> findByClasseContainingIgnoreCaseOrderByDateCreationDesc(String classe);
    
    // Recherche par matière
    List<Rattrapage> findByMatiereContainingIgnoreCaseOrderByDateCreationDesc(String matiere);
}
