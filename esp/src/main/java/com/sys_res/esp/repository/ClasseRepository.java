package com.sys_res.esp.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.sys_res.esp.entity.Classe;

public interface ClasseRepository extends JpaRepository<Classe, Integer> {
    // méthodes personnalisées si besoin
} 