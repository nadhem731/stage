package com.sys_res.esp.repository;

import java.util.List;
import java.sql.Date;
import java.sql.Time;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.sys_res.esp.entity.Soutenance;

public interface SoutenanceRepository extends JpaRepository<Soutenance, Long> {
    
    // Pour l'instant, retourner toutes les soutenances validées (à corriger quand la table jury sera créée)
    @Query("SELECT s FROM Soutenance s WHERE s.statutValidation = 'valide'")
    List<Soutenance> findSoutenancesByJuryMember(@Param("enseignantId") Long enseignantId);
    
    @Query("SELECT s FROM Soutenance s WHERE s.statutValidation = 'valide'")
    List<Soutenance> findValidatedSoutenancesByJuryMember(@Param("enseignantId") Long enseignantId);
    
    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Soutenance s WHERE s.statutValidation = 'valide'")
    boolean hasValidatedSoutenances();
    
    List<Soutenance> findByStatutValidation(String statutValidation);
    
    // Trouver les soutenances d'origine à supprimer lors d'un rattrapage
    @Query("SELECT s FROM Soutenance s WHERE s.date = :dateAbsence " +
           "AND s.heureTime = :heureDebut " +
           "AND s.statutValidation = 'valide'")
    List<Soutenance> findOriginalSoutenance(@Param("dateAbsence") Date dateAbsence,
                                         @Param("heureDebut") Time heureDebut);
    
    // Supprimer les soutenances d'origine lors d'un rattrapage approuvé
    @Modifying
    @Transactional
    @Query("DELETE FROM Soutenance s WHERE s.date = :dateAbsence " +
           "AND s.heureTime = :heureDebut " +
           "AND s.statutValidation = 'valide'")
    int deleteOriginalSoutenance(@Param("dateAbsence") Date dateAbsence,
                               @Param("heureDebut") Time heureDebut);
    
    @Query("SELECT s FROM Soutenance s WHERE s.user.idUser = :userId")
    List<Soutenance> findByEtudiantId(@Param("userId") Long userId);
}