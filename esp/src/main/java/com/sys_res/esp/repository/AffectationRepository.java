package com.sys_res.esp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

import com.sys_res.esp.entity.Affectation;

public interface AffectationRepository extends JpaRepository<Affectation, Integer> {
    
    @Query("SELECT a FROM Affectation a WHERE a.user.role.typeRole = 'Etudiant'")
    List<Affectation> findStudentAffectations();
    
    @Query("SELECT a.user FROM Affectation a WHERE a.classe.idClasse = :classeId AND a.user.role.typeRole = 'Etudiant'")
    List<com.sys_res.esp.entity.Users> findStudentsByClasseId(@org.springframework.data.repository.query.Param("classeId") Integer classeId);
    
    @Query("SELECT a FROM Affectation a WHERE a.user.idUser = :userId")
    List<Affectation> findByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);
}