package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.Role;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.RoleRepository;
import com.sys_res.esp.repository.UsersRepository;

@Service
public class UsersService {

    private final UsersRepository usersRepository;
    private final RoleRepository roleRepository;

    @Autowired
    public UsersService(UsersRepository usersRepository, RoleRepository roleRepository) {
        this.usersRepository = usersRepository;
        this.roleRepository = roleRepository;
    }

    public List<Users> findAll() {
        return usersRepository.findAll();
    }

    public Optional<Users> findById(Long id) {
        return usersRepository.findById(id);
    }

     public List<Users> findByRole(String roleType) {
        System.out.println("DEBUG: Recherche d'utilisateurs avec le rôle: " + roleType);
        Optional<Role> role = roleRepository.findById(roleType);
        if (role.isEmpty()) {
            System.out.println("DEBUG: Rôle '" + roleType + "' non trouvé dans la base de données");
            return List.of();
        }
        List<Users> users = usersRepository.findByRole(role.get());
        System.out.println("DEBUG: Trouvé " + users.size() + " utilisateurs avec le rôle " + roleType);
        return users;
    }

    public Users save(Users user) {
        return usersRepository.save(user);
    }

    public void deleteById(Long id) {
        usersRepository.deleteById(id);
    }

     public Optional<Users> findByEmail(String email) {
        return usersRepository.findByEmail(email);
    }

    public Optional<Users> findByIdentifiant(String identifiant) {
        return usersRepository.findByIdentifiant(identifiant);
    }

    public List<Users> getEtudiantsByClasse(Integer classeId) {
        // Essayer différentes variantes du rôle étudiant
        List<Users> etudiants = findByRole("Etudiant");
        if (etudiants.isEmpty()) {
            System.out.println("DEBUG: Aucun étudiant trouvé avec 'Etudiant', essai avec 'etudiant'");
            etudiants = findByRole("etudiant");
        }
        if (etudiants.isEmpty()) {
            System.out.println("DEBUG: Aucun étudiant trouvé avec 'etudiant', essai avec 'ETUDIANT'");
            etudiants = findByRole("ETUDIANT");
        }
        
        System.out.println("DEBUG: Trouvé " + etudiants.size() + " étudiants au total");
        
        // Pour l'instant, simulation d'association classe-étudiant
        // Dans une vraie implémentation, il faudrait une table de liaison
        List<Users> etudiantsClasse = etudiants.stream()
            .filter(etudiant -> {
                // Simulation: associer les étudiants aux classes selon un modulo
                long studentId = etudiant.getIdUser();
                return (studentId % 5) == (classeId % 5);
            })
            .limit(8) // Limiter à 8 étudiants par classe
            .collect(java.util.stream.Collectors.toList());
            
        System.out.println("DEBUG: Récupération de " + etudiantsClasse.size() + " étudiants pour la classe ID: " + classeId);
        return etudiantsClasse;
    }
}