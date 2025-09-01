package com.sys_res.esp.repository;

import com.sys_res.esp.entity.Planning;
import java.util.List;
import java.util.Optional;
import java.sql.Date;
import java.sql.Time;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface PlanningRepository extends JpaRepository<Planning, Integer> {
    List<Planning> findByDateDebutBetween(Date startDate, Date endDate);
    
    @Query("SELECT p FROM Planning p WHERE p.user.idUser = :userId")
    List<Planning> findByUserId(@Param("userId") Long userId);
    
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Planning p WHERE p.statutValidation = 'valide'")
    boolean hasValidatedPlannings();
    
    List<Planning> findByStatutValidation(String statutValidation);
    
    // Trouver les cours/soutenances d'origine à supprimer lors d'un rattrapage
    @Query("SELECT p FROM Planning p WHERE p.user.idUser = :enseignantId " +
           "AND p.dateDebut = :dateAbsence " +
           "AND p.heureDebut = :heureDebut " +
           "AND p.heureFin = :heureFin " +
           "AND p.statutValidation = 'valide'")
    List<Planning> findOriginalSeance(@Param("enseignantId") Long enseignantId,
                                     @Param("dateAbsence") Date dateAbsence,
                                     @Param("heureDebut") Time heureDebut,
                                     @Param("heureFin") Time heureFin);
    
    // Supprimer les séances d'origine lors d'un rattrapage approuvé
    @Modifying
    @Transactional
    @Query("DELETE FROM Planning p WHERE p.user.idUser = :enseignantId " +
           "AND p.dateDebut = :dateAbsence " +
           "AND p.heureDebut = :heureDebut " +
           "AND p.heureFin = :heureFin " +
           "AND p.statutValidation = 'valide'")
    int deleteOriginalSeance(@Param("enseignantId") Long enseignantId,
                           @Param("dateAbsence") Date dateAbsence,
                           @Param("heureDebut") Time heureDebut,
                           @Param("heureFin") Time heureFin);
    
    @Query("SELECT p FROM Planning p WHERE p.classe.idClasse = :classeId")
    List<Planning> findByClasseId(@Param("classeId") Integer classeId);
}
