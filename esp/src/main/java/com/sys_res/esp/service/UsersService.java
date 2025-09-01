package com.sys_res.esp.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.sys_res.esp.entity.Role;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.repository.RoleRepository;
import com.sys_res.esp.repository.UsersRepository;

@Service
public class UsersService {

    private final UsersRepository usersRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UsersService(UsersRepository usersRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.usersRepository = usersRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<Users> findAll() {
        return usersRepository.findAll();
    }

    public Optional<Users> findById(Long id) {
        return usersRepository.findById(id);
    }

     public List<Users> findByRole(String roleType) {
        System.out.println("DEBUG: Recherche d'utilisateurs avec le rôle: " + roleType);
        
        // Essayer différentes variantes du rôle
        Optional<Role> role = roleRepository.findById(roleType);
        if (role.isEmpty()) {
            System.out.println("DEBUG: Rôle '" + roleType + "' non trouvé, essai avec d'autres variantes");
            
            // Essayer avec la première lettre en majuscule
            String capitalizedRole = roleType.substring(0, 1).toUpperCase() + roleType.substring(1).toLowerCase();
            role = roleRepository.findById(capitalizedRole);
            
            if (role.isEmpty()) {
                // Essayer en minuscules
                role = roleRepository.findById(roleType.toLowerCase());
            }
            
            if (role.isEmpty()) {
                // Essayer en majuscules
                role = roleRepository.findById(roleType.toUpperCase());
            }
        }
        
        if (role.isEmpty()) {
            System.out.println("DEBUG: Aucune variante du rôle '" + roleType + "' trouvée dans la base de données");
            return List.of();
        }
        
        List<Users> users = usersRepository.findByRole(role.get());
        System.out.println("DEBUG: Trouvé " + users.size() + " utilisateurs avec le rôle " + role.get().getTypeRole());
        return users;
    }

    public Users save(Users user) {
        // Debug: Vérifier les données avant sauvegarde
        System.out.println("DEBUG: Données avant sauvegarde dans le service:");
        System.out.println("  - Nom: " + user.getNom());
        System.out.println("  - Prénom: " + user.getPrenom());
        System.out.println("  - Email: " + user.getEmail());
        System.out.println("  - Identifiant: " + user.getIdentifiant());
        System.out.println("  - CIN: " + user.getCin());
        System.out.println("  - Matière: " + user.getMatiere());
        System.out.println("  - Téléphone: " + user.getTel());
        System.out.println("  - Rôle: " + (user.getRole() != null ? user.getRole().getTypeRole() : "null"));
        
        // Hash the password if it's not already hashed (BCrypt hashes start with $2a$, $2b$, or $2y$)
        if (user.getPassword() != null && !user.getPassword().startsWith("$2")) {
            System.out.println("DEBUG: Hashing password for user: " + user.getIdentifiant());
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        
        Users savedUser = usersRepository.save(user);
        
        // Debug: Vérifier les données après sauvegarde
        System.out.println("DEBUG: Données après sauvegarde dans le service:");
        System.out.println("  - ID: " + savedUser.getIdUser());
        System.out.println("  - Nom: " + savedUser.getNom());
        System.out.println("  - Prénom: " + savedUser.getPrenom());
        System.out.println("  - Email: " + savedUser.getEmail());
        System.out.println("  - Identifiant: " + savedUser.getIdentifiant());
        System.out.println("  - CIN: " + savedUser.getCin());
        System.out.println("  - Matière: " + savedUser.getMatiere());
        System.out.println("  - Téléphone: " + savedUser.getTel());
        System.out.println("  - Rôle: " + (savedUser.getRole() != null ? savedUser.getRole().getTypeRole() : "null"));
        
        return savedUser;
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