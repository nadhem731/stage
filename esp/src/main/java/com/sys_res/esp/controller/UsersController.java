package com.sys_res.esp.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import com.sys_res.esp.entity.Users;
import com.sys_res.esp.service.UsersService;

@RestController
@RequestMapping("/api/users")
public class UsersController {

    private final UsersService usersService;

    @Autowired
    public UsersController(UsersService usersService) {
        this.usersService = usersService;
    }

    @GetMapping
    public List<Users> getAll(@RequestParam(required = false) String role) {
        if (role != null && !role.isEmpty()) {
            return usersService.findByRole(role);
        } else {
            return usersService.findAll();
        }
    }

    @GetMapping("/{id}")
    public Optional<Users> getById(@PathVariable Long id) {
        return usersService.findById(id);
    }

    @PostMapping
    public Users create(@RequestBody Users user) {
        return usersService.save(user);
    }

    @PutMapping("/{id}")
    public Users update(@PathVariable Long id, @RequestBody Users user) {
        Users existing = usersService.findById(id).orElseThrow();

        // Met à jour uniquement les champs non nuls/non vides
        if (user.getNom() != null) existing.setNom(user.getNom());
        if (user.getPrenom() != null) existing.setPrenom(user.getPrenom());
        if (user.getEmail() != null) existing.setEmail(user.getEmail());
        if (user.getTel() != null) existing.setTel(user.getTel());
        if (user.getIdentifiant() != null) existing.setIdentifiant(user.getIdentifiant());
        if (user.getCin() != null) existing.setCin(user.getCin());
        if (user.getMatiere() != null) existing.setMatiere(user.getMatiere());

        // Mot de passe : ne le change que s'il est fourni et non vide
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            existing.setPassword(user.getPassword());
        }

        // Ne touche pas au rôle (il reste inchangé)

        return usersService.save(existing);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        usersService.deleteById(id);
    }

    @PutMapping("/{id}/disponibilite")
    public Users updateDisponibilite(@PathVariable Long id, @RequestBody Map<String, Object> disponibilite) {
        Users existing = usersService.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        existing.setDisponibilite(disponibilite);
        return usersService.save(existing);
    }

    @GetMapping("/etudiants/classe/{classeId}")
    public List<Users> getEtudiantsByClasse(@PathVariable Integer classeId) {
        return usersService.getEtudiantsByClasse(classeId);
    }

    @GetMapping("/enseignants")
    public List<Users> getEnseignants() {
        // Essayer différentes variantes du rôle enseignant
        List<Users> enseignants = usersService.findByRole("enseignant");
        if (enseignants.isEmpty()) {
            System.out.println("DEBUG: Aucun enseignant trouvé avec 'enseignant', essai avec 'Enseignant'");
            enseignants = usersService.findByRole("Enseignant");
        }
        if (enseignants.isEmpty()) {
            System.out.println("DEBUG: Aucun enseignant trouvé avec 'Enseignant', essai avec 'ENSEIGNANT'");
            enseignants = usersService.findByRole("ENSEIGNANT");
        }
        
        System.out.println("DEBUG: Récupération de " + enseignants.size() + " enseignants");
        for (Users enseignant : enseignants) {
            System.out.println("DEBUG: Enseignant - ID: " + enseignant.getIdUser() + 
                             ", Nom: " + enseignant.getNom() + 
                             ", Prénom: " + enseignant.getPrenom() + 
                             ", Matière: " + enseignant.getMatiere() +
                             ", Rôle: " + (enseignant.getRole() != null ? enseignant.getRole().getTypeRole() : "null"));
        }
        return enseignants;
    }

    @GetMapping("/etudiants")
    public List<Users> getEtudiants() {
        // Essayer différentes variantes du rôle étudiant
        List<Users> etudiants = usersService.findByRole("etudiant");
        if (etudiants.isEmpty()) {
            System.out.println("DEBUG: Aucun étudiant trouvé avec 'etudiant', essai avec 'Etudiant'");
            etudiants = usersService.findByRole("Etudiant");
        }
        if (etudiants.isEmpty()) {
            System.out.println("DEBUG: Aucun étudiant trouvé avec 'Etudiant', essai avec 'ETUDIANT'");
            etudiants = usersService.findByRole("ETUDIANT");
        }
        
        System.out.println("DEBUG: Récupération de " + etudiants.size() + " étudiants");
        return etudiants;
    }
}
