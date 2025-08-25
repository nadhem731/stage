package com.sys_res.esp.repository;

import com.sys_res.esp.entity.Planning;
import java.util.List;
import java.util.Optional;
import java.sql.Date;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlanningRepository extends JpaRepository<Planning, Integer> {
    List<Planning> findByDateDebutBetween(Date startDate, Date endDate);
    
    @Query("SELECT p FROM Planning p WHERE p.user.idUser = :userId")
    List<Planning> findByUserId(@Param("userId") Long userId);
    
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM Planning p WHERE p.statutValidation = 'valide'")
    boolean hasValidatedPlannings();
}
