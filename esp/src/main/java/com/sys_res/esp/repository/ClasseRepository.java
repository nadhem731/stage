package com.sys_res.esp.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

import com.sys_res.esp.entity.Classe;

public interface ClasseRepository extends JpaRepository<Classe, Integer> {
    // méthodes personnalisées si besoin
    Optional<Classe> findByNomClasse(String nomClasse);
}