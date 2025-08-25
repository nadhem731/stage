package com.sys_res.esp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

import com.sys_res.esp.entity.Affectation;

public interface AffectationRepository extends JpaRepository<Affectation, Integer> {
    
    @Query("SELECT a FROM Affectation a WHERE a.user.role.typeRole = 'Etudiant'")
    List<Affectation> findStudentAffectations();
}