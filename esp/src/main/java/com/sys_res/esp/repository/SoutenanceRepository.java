package com.sys_res.esp.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.sys_res.esp.entity.Soutenance;

public interface SoutenanceRepository extends JpaRepository<Soutenance, Long> {
    
    // Pour l'instant, retourner toutes les soutenances validées (à corriger quand la table jury sera créée)
    @Query("SELECT s FROM Soutenance s WHERE s.statutValidation = 'valide'")
    List<Soutenance> findSoutenancesByJuryMember(@Param("enseignantId") Long enseignantId);
    
    @Query("SELECT s FROM Soutenance s WHERE s.statutValidation = 'valide'")
    List<Soutenance> findValidatedSoutenancesByJuryMember(@Param("enseignantId") Long enseignantId);
    
    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM Soutenance s WHERE s.statutValidation = 'valide'")
    boolean hasValidatedSoutenances();
}