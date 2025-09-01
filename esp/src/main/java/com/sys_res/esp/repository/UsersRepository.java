package com.sys_res.esp.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.sys_res.esp.entity.Classe;
import com.sys_res.esp.entity.Role;
import com.sys_res.esp.entity.Users;

public interface UsersRepository extends JpaRepository<Users, Long> {
    Optional<Users> findByEmail(String email);
    Optional<Users> findByIdentifiant(String identifiant);
    List<Users> findByRole(Role role);
    List<Users> findByRole_TypeRole(String typeRole);
    
    @Query("SELECT u FROM Users u WHERE u.classe = :classe AND u.role.typeRole = :role")
    List<Users> findByClasseAndRole(@Param("classe") Classe classe, @Param("role") String role);
    
    @Query("SELECT u FROM Users u WHERE u.classe.nomClasse = :className AND u.role.typeRole = 'ETUDIANT'")
    List<Users> findStudentsByClassName(@Param("className") String className);
    
    // Méthode alternative pour debug - recherche avec différentes variantes du rôle
    @Query("SELECT u FROM Users u WHERE u.classe.nomClasse = :className AND (u.role.typeRole = 'ETUDIANT' OR u.role.typeRole = 'Etudiant' OR u.role.typeRole = 'etudiant')")
    List<Users> findStudentsByClassNameAllVariants(@Param("className") String className);
    
    // Méthode pour rechercher les étudiants via la table Affectation
    @Query("SELECT u FROM Users u JOIN Affectation a ON u.idUser = a.user.idUser WHERE a.classe.nomClasse = :className AND (u.role.typeRole = 'ETUDIANT' OR u.role.typeRole = 'Etudiant' OR u.role.typeRole = 'etudiant')")
    List<Users> findStudentsByClassNameViaAffectation(@Param("className") String className);
    
    // Méthode pour rechercher les étudiants par ID de classe
    @Query("SELECT u FROM Users u JOIN Affectation a ON u.idUser = a.user.idUser WHERE a.classe.idClasse = :classeId AND (u.role.typeRole = 'ETUDIANT' OR u.role.typeRole = 'Etudiant' OR u.role.typeRole = 'etudiant')")
    List<Users> findStudentsByClasseId(@Param("classeId") Long classeId);
}
