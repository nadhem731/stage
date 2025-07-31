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
import org.springframework.web.bind.annotation.RestController;

import com.sys_res.esp.entity.Users;
import com.sys_res.esp.service.UsersService;

@RestController
@RequestMapping("/api/users")
public class UsersController {
    @Autowired
    private UsersService usersService;

    @GetMapping
    public List<Users> getAll() { return usersService.findAll(); }

    @GetMapping("/{id}")
    public Optional<Users> getById(@PathVariable Long id) { return usersService.findById(id); }

    @PostMapping
    public Users create(@RequestBody Users user) { return usersService.save(user); }

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
    public void delete(@PathVariable Long id) { usersService.deleteById(id); }
} 