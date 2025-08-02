package com.sys_res.esp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.sys_res.esp.entity.TypePlanning;

@Repository
public interface TypePlanningRepository extends JpaRepository<TypePlanning, String> {
}